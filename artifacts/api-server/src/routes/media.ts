import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, mediaTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";

const router = Router();

function getCloudinaryConfig() {
  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
    api_key: process.env.CLOUDINARY_API_KEY || "",
    api_secret: process.env.CLOUDINARY_API_SECRET || "",
  };
}

router.get("/media", requireAuth, async (_req, res): Promise<void> => {
  const items = await db.select().from(mediaTable).orderBy(desc(mediaTable.createdAt));
  res.json(items.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

// Get Cloudinary upload signature for direct browser upload
router.get("/media/upload-signature", requireAuth, requireRole(["admin", "leadership", "workforce"]), async (_req, res): Promise<void> => {
  const config = getCloudinaryConfig();
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = "dcl-lugazi";
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha256").update(paramsToSign + config.api_secret).digest("hex");
  res.json({ signature, timestamp, cloudName: config.cloud_name, apiKey: config.api_key });
});

router.post("/media", requireAuth, requireRole(["admin", "leadership", "workforce"]), async (req: AuthRequest, res): Promise<void> => {
  const { title, type, url, thumbnailUrl, description, cloudinaryId } = req.body;
  if (!title || !type || !url) {
    res.status(400).json({ error: "title, type, url required" }); return;
  }
  const [item] = await db.insert(mediaTable).values({ title, type, url, thumbnailUrl, description, cloudinaryId, uploadedBy: req.userId }).returning();
  res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
});

router.delete("/media/:id", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [item] = await db.select().from(mediaTable).where(eq(mediaTable.id, id)).limit(1);
  if (item?.cloudinaryId) {
    const config = getCloudinaryConfig();
    cloudinary.config(config);
    await cloudinary.uploader.destroy(item.cloudinaryId).catch(() => {});
  }
  await db.delete(mediaTable).where(eq(mediaTable.id, id));
  res.sendStatus(204);
});

export default router;

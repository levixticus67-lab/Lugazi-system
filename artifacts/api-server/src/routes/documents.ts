import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, documentsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

router.get("/documents", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const all = await db.select().from(documentsTable).orderBy(desc(documentsTable.createdAt));
  // Filter by accessRoles
  const role = req.userRole ?? "member";
  const filtered = all.filter(d => d.accessRoles.includes(role) || d.accessRoles.includes("all"));
  res.json(filtered.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })));
});

// admin + pastor only
router.post("/documents", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const { title, description, category, fileUrl, fileType, fileSize, accessRoles } = req.body;
  if (!title || !category || !fileUrl || !fileType) {
    res.status(400).json({ error: "title, category, fileUrl, fileType required" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const [doc] = await db.insert(documentsTable).values({
    title, description, category, fileUrl, fileType,
    fileSize: fileSize ?? null,
    uploadedBy: req.userId!, uploadedByName: user?.displayName ?? null,
    accessRoles: accessRoles ?? ["admin", "leadership", "workforce", "member"],
  }).returning();
  await logActivity({
    userId: req.userId,
    action: "upload_document",
    entityType: "document",
    entityId: doc.id,
    entityName: title,
    details: `Category: ${category} | Type: ${fileType}`,
    ipAddress: req.ip ?? "unknown",
  });
  res.status(201).json({ ...doc, createdAt: doc.createdAt.toISOString() });
});

// admin + pastor only
router.delete("/documents/:id", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [existing] = await db.select({ title: documentsTable.title }).from(documentsTable).where(eq(documentsTable.id, id)).limit(1);
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  await logActivity({
    userId: req.userId,
    action: "delete_document",
    entityType: "document",
    entityId: id,
    entityName: existing?.title,
    ipAddress: req.ip ?? "unknown",
  });
  res.sendStatus(204);
});

export default router;

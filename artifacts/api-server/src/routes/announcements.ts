import { Router } from "express";
import { desc, or, eq } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/announcements", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const audience = (req.query.audience as string) || "all";
  const rows = await db
    .select()
    .from(announcementsTable)
    .where(audience === "all"
      ? undefined
      : or(eq(announcementsTable.audience, "all"), eq(announcementsTable.audience, audience))
    )
    .orderBy(desc(announcementsTable.createdAt))
    .limit(20);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/announcements", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { title, message, audience, sentBy } = req.body;
  if (!title?.trim() || !message?.trim()) {
    res.status(400).json({ error: "title and message are required" });
    return;
  }
  const [record] = await db.insert(announcementsTable).values({
    title: title.trim(),
    message: message.trim(),
    audience: audience || "all",
    sentBy: sentBy || "Admin",
    sentByUserId: req.userId ?? undefined,
  }).returning();
  logger.info({ id: record.id, audience: record.audience }, "Announcement sent");
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.delete("/announcements/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.json({ success: true });
});

export default router;

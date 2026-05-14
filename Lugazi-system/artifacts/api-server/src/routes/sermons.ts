import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, sermonsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/sermons", requireAuth, async (_req, res): Promise<void> => {
  const sermons = await db.select().from(sermonsTable).orderBy(desc(sermonsTable.sermonDate));
  res.json(sermons.map(s => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() })));
});

router.post("/sermons", requireAuth, requireRole(["admin", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const { title, preacher, sermonDate, series, description, mediaUrl, mediaType, thumbnailUrl, scriptureRef, branchId } = req.body;
  if (!title || !preacher || !sermonDate) {
    res.status(400).json({ error: "title, preacher, and sermonDate are required" });
    return;
  }
  const [sermon] = await db.insert(sermonsTable).values({
    title, preacher, sermonDate, series, description, mediaUrl, mediaType: mediaType || "audio",
    thumbnailUrl, scriptureRef, branchId, createdBy: req.userId,
  }).returning();
  res.status(201).json({ ...sermon, createdAt: sermon.createdAt.toISOString(), updatedAt: sermon.updatedAt.toISOString() });
});

router.patch("/sermons/:id", requireAuth, requireRole(["admin", "leadership"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { title, preacher, sermonDate, series, description, mediaUrl, mediaType, thumbnailUrl, scriptureRef } = req.body;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (preacher !== undefined) update.preacher = preacher;
  if (sermonDate !== undefined) update.sermonDate = sermonDate;
  if (series !== undefined) update.series = series;
  if (description !== undefined) update.description = description;
  if (mediaUrl !== undefined) update.mediaUrl = mediaUrl;
  if (mediaType !== undefined) update.mediaType = mediaType;
  if (thumbnailUrl !== undefined) update.thumbnailUrl = thumbnailUrl;
  if (scriptureRef !== undefined) update.scriptureRef = scriptureRef;
  const [updated] = await db.update(sermonsTable).set(update).where(eq(sermonsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/sermons/:id", requireAuth, requireRole(["admin", "leadership"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(sermonsTable).where(eq(sermonsTable.id, id));
  res.sendStatus(204);
});

export default router;

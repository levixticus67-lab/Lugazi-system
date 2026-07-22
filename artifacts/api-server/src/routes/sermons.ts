import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, sermonsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

router.get("/sermons", requireAuth, async (req, res): Promise<void> => {
  const MAX_LIMIT = 200;
  const DEFAULT_LIMIT = 100;
  const rawLimit = parseInt(req.query.limit as string, 10);
  const rawPage  = parseInt(req.query.page  as string, 10);
  const limit  = (!isNaN(rawLimit) && rawLimit > 0) ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  const page   = (!isNaN(rawPage)  && rawPage  > 0) ? rawPage : 1;
  const offset = (page - 1) * limit;
  const sermons = await db
    .select()
    .from(sermonsTable)
    .orderBy(desc(sermonsTable.sermonDate))
    .limit(limit)
    .offset(offset);
  res.json(sermons.map(s => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() })));
});

router.post("/sermons", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const { title, preacher, sermonDate, series, description, mediaUrl, mediaType, thumbnailUrl, scriptureRef, branchId } = req.body;
  if (!title || !preacher || !sermonDate) {
    res.status(400).json({ error: "title, preacher, and sermonDate are required" });
    return;
  }
  const [sermon] = await db.insert(sermonsTable).values({
    title, preacher, sermonDate, series, description, mediaUrl, mediaType: mediaType || "audio",
    thumbnailUrl, scriptureRef, branchId, createdBy: req.userId,
  }).returning();
  const [actor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await logActivity({ userId: req.userId!, displayName: actor?.displayName ?? "Admin", action: "create_sermon", entityType: "sermon", entityId: sermon.id, entityName: title, ipAddress: req.ip ?? "unknown" });
  res.status(201).json({ ...sermon, createdAt: sermon.createdAt.toISOString(), updatedAt: sermon.updatedAt.toISOString() });
});

router.patch("/sermons/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req, res): Promise<void> => {
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

router.delete("/sermons/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [existing] = await db.select({ title: sermonsTable.title }).from(sermonsTable).where(eq(sermonsTable.id, id)).limit(1);
  const [actor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await db.delete(sermonsTable).where(eq(sermonsTable.id, id));
  await logActivity({ userId: req.userId!, displayName: actor?.displayName ?? "Admin", action: "delete_sermon", entityType: "sermon", entityId: id, entityName: existing?.title, ipAddress: req.ip ?? "unknown" });
  res.sendStatus(204);
});

export default router;

import { Router } from "express";
import { desc, or, eq, and, isNull, gt } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/announcements", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const audience = (req.query.audience as string) || "all";
  const type = (req.query.type as string) || "broadcast";
  const now = new Date();

  let whereClause;
  if (type === "hero") {
    whereClause = and(
      eq(announcementsTable.type, "hero"),
      or(isNull(announcementsTable.expiresAt), gt(announcementsTable.expiresAt, now))
    );
  } else {
    whereClause = and(
      eq(announcementsTable.type, "broadcast"),
      audience !== "all"
        ? or(eq(announcementsTable.audience, "all"), eq(announcementsTable.audience, audience))
        : undefined
    );
  }

  const rows = await db
    .select()
    .from(announcementsTable)
    .where(whereClause)
    .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt))
    .limit(50);

  res.json(rows.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
  })));
});

router.post("/announcements", requireAuth, requireRole(["admin", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const {
    title, message, audience, sentBy, type,
    mediaUrl, mediaType, bgGradient, linkUrl, linkLabel, expiresAt, isPinned,
  } = req.body;
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
    type: type || "broadcast",
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || null,
    bgGradient: bgGradient || "violet",
    linkUrl: linkUrl || null,
    linkLabel: linkLabel || null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    isPinned: isPinned ?? false,
  }).returning();
  logger.info({ id: record.id, type: record.type }, "Announcement created");
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString(), expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null });
});

router.patch("/announcements/:id", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  const { title, message, audience, type, mediaUrl, mediaType, bgGradient, linkUrl, linkLabel, expiresAt, isPinned } = req.body;
  const [record] = await db.update(announcementsTable).set({
    ...(title !== undefined && { title }),
    ...(message !== undefined && { message }),
    ...(audience !== undefined && { audience }),
    ...(type !== undefined && { type }),
    ...(mediaUrl !== undefined && { mediaUrl }),
    ...(mediaType !== undefined && { mediaType }),
    ...(bgGradient !== undefined && { bgGradient }),
    ...(linkUrl !== undefined && { linkUrl }),
    ...(linkLabel !== undefined && { linkLabel }),
    ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    ...(isPinned !== undefined && { isPinned }),
  }).where(eq(announcementsTable.id, id)).returning();
  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...record, createdAt: record.createdAt.toISOString(), expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null });
});

router.delete("/announcements/:id", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res): Promise<void> => {
  await db.delete(announcementsTable).where(eq(announcementsTable.id, Number(req.params.id)));
  res.json({ success: true });
});

export default router;

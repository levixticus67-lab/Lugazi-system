import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, inductionTracksTable, inductionEnrollmentsTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

// ─── Tracks ───────────────────────────────────────────────────────────────────

router.get("/induction/tracks", requireAuth, async (_req, res): Promise<void> => {
  const tracks = await db.select().from(inductionTracksTable).orderBy(inductionTracksTable.level);
  res.json(tracks.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })));
});

// auth (leadership and above in practice)
router.post("/induction/tracks", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, description, level, totalSessions } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "Track name is required" }); return; }
  const [record] = await db.insert(inductionTracksTable).values({
    name: name.trim(), description: description?.trim() || null,
    level: Number(level) || 1, totalSessions: Number(totalSessions) || 4,
  }).returning();
  await logActivity({
    userId: req.userId,
    action: "create_induction_track",
    entityType: "induction_track",
    entityId: record.id,
    entityName: name.trim(),
    details: `Level ${record.level} | ${record.totalSessions} sessions`,
    ipAddress: req.ip ?? "unknown",
  });
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

// auth
router.patch("/induction/tracks/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { name, description, level, totalSessions, isActive } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description || null;
  if (level !== undefined) update.level = Number(level);
  if (totalSessions !== undefined) update.totalSessions = Number(totalSessions);
  if (isActive !== undefined) update.isActive = Boolean(isActive);
  const [record] = await db.update(inductionTracksTable).set(update).where(eq(inductionTracksTable.id, id)).returning();
  if (!record) { res.status(404).json({ error: "Track not found" }); return; }
  await logActivity({
    userId: req.userId,
    action: "update_induction_track",
    entityType: "induction_track",
    entityId: id,
    entityName: record.name,
    ipAddress: req.ip ?? "unknown",
  });
  res.json({ ...record, createdAt: record.createdAt.toISOString() });
});

// auth
router.delete("/induction/tracks/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [existing] = await db.select({ name: inductionTracksTable.name }).from(inductionTracksTable).where(eq(inductionTracksTable.id, id)).limit(1);
  await db.delete(inductionTracksTable).where(eq(inductionTracksTable.id, id));
  await logActivity({
    userId: req.userId,
    action: "delete_induction_track",
    entityType: "induction_track",
    entityId: id,
    entityName: existing?.name,
    ipAddress: req.ip ?? "unknown",
  });
  res.sendStatus(204);
});

// ─── Enrollments ──────────────────────────────────────────────────────────────

router.get("/induction/enrollments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
  let query = db.select().from(inductionEnrollmentsTable).orderBy(desc(inductionEnrollmentsTable.enrolledAt)).$dynamic();
  if (memberId) query = query.where(eq(inductionEnrollmentsTable.memberId, memberId));
  const records = await query;
  res.json(records.map(r => ({
    ...r,
    enrolledAt: r.enrolledAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  })));
});

// auth
router.post("/induction/enrollments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { memberId, memberName, trackId, trackName } = req.body;
  if (!memberId || !trackId) { res.status(400).json({ error: "memberId and trackId are required" }); return; }
  if (!memberName?.trim()) { res.status(400).json({ error: "memberName is required" }); return; }
  const [record] = await db.insert(inductionEnrollmentsTable).values({
    memberId: Number(memberId), memberName: memberName.trim(),
    trackId: Number(trackId), trackName,
  }).returning();
  await logActivity({
    userId: req.userId,
    action: "enrol_induction",
    entityType: "induction_enrollment",
    entityId: record.id,
    entityName: memberName.trim(),
    details: `Track: ${trackName}`,
    ipAddress: req.ip ?? "unknown",
  });
  res.status(201).json({ ...record, enrolledAt: record.enrolledAt.toISOString(), completedAt: null });
});

// auth
router.patch("/induction/enrollments/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { progress, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (progress !== undefined) updates.progress = Math.min(100, Math.max(0, Number(progress)));
  if (status) {
    updates.status = status;
    updates.completedAt = status === "completed" ? new Date() : null;
  }
  const [record] = await db.update(inductionEnrollmentsTable).set(updates).where(eq(inductionEnrollmentsTable.id, id)).returning();
  if (!record) { res.status(404).json({ error: "Enrollment not found" }); return; }
  const details = status ? `Status: ${status}` : `Progress: ${updates.progress}%`;
  await logActivity({
    userId: req.userId,
    action: "update_induction_enrollment",
    entityType: "induction_enrollment",
    entityId: id,
    entityName: record.memberName,
    details: `${details} | Track: ${record.trackName}`,
    ipAddress: req.ip ?? "unknown",
  });
  res.json({ ...record, enrolledAt: record.enrolledAt.toISOString(), completedAt: record.completedAt?.toISOString() ?? null });
});

// auth
router.delete("/induction/enrollments/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [existing] = await db.select({ memberName: inductionEnrollmentsTable.memberName, trackName: inductionEnrollmentsTable.trackName })
    .from(inductionEnrollmentsTable).where(eq(inductionEnrollmentsTable.id, id)).limit(1);
  await db.delete(inductionEnrollmentsTable).where(eq(inductionEnrollmentsTable.id, id));
  await logActivity({
    userId: req.userId,
    action: "delete_induction_enrollment",
    entityType: "induction_enrollment",
    entityId: id,
    entityName: existing?.memberName,
    details: existing?.trackName ? `Track: ${existing.trackName}` : undefined,
    ipAddress: req.ip ?? "unknown",
  });
  res.sendStatus(204);
});

export default router;

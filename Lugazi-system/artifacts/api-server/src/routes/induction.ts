import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, inductionTracksTable, inductionEnrollmentsTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/induction/tracks", requireAuth, async (_req, res): Promise<void> => {
  const tracks = await db.select().from(inductionTracksTable).orderBy(inductionTracksTable.level);
  res.json(tracks.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })));
});

router.post("/induction/tracks", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, description, level, totalSessions } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [record] = await db.insert(inductionTracksTable).values({ name, description, level: Number(level) || 1, totalSessions: Number(totalSessions) || 4 }).returning();
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.get("/induction/enrollments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
  let query = db.select().from(inductionEnrollmentsTable).orderBy(desc(inductionEnrollmentsTable.enrolledAt)).$dynamic();
  if (memberId) query = query.where(eq(inductionEnrollmentsTable.memberId, memberId));
  const records = await query;
  res.json(records.map(r => ({ ...r, enrolledAt: r.enrolledAt.toISOString(), completedAt: r.completedAt?.toISOString() ?? null })));
});

router.post("/induction/enrollments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { memberId, memberName, trackId, trackName } = req.body;
  if (!memberId || !trackId) { res.status(400).json({ error: "memberId and trackId required" }); return; }
  const [record] = await db.insert(inductionEnrollmentsTable).values({ memberId: Number(memberId), memberName, trackId: Number(trackId), trackName }).returning();
  res.status(201).json({ ...record, enrolledAt: record.enrolledAt.toISOString(), completedAt: null });
});

router.patch("/induction/enrollments/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  const { progress, status } = req.body;
  const updates: Record<string, unknown> = { progress: Number(progress) };
  if (status) updates.status = status;
  if (status === "completed") updates.completedAt = new Date();
  const [record] = await db.update(inductionEnrollmentsTable).set(updates).where(eq(inductionEnrollmentsTable.id, id)).returning();
  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...record, enrolledAt: record.enrolledAt.toISOString(), completedAt: record.completedAt?.toISOString() ?? null });
});

export default router;

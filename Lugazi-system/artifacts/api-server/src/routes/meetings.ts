import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, meetingsTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/meetings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = req.query.target as string | undefined;
  let query = db.select().from(meetingsTable).orderBy(desc(meetingsTable.scheduledAt)).$dynamic();
  if (target) query = query.where(eq(meetingsTable.portalTarget, target));
  const meetings = await query;
  res.json(meetings.map(m => ({ ...m, scheduledAt: m.scheduledAt.toISOString(), createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() })));
});

router.post("/meetings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { title, description, agenda, scheduledAt, location, portalTarget, notes } = req.body;
  if (!title || !scheduledAt) { res.status(400).json({ error: "title and scheduledAt required" }); return; }
  const [record] = await db.insert(meetingsTable).values({
    title, description, agenda,
    scheduledAt: new Date(scheduledAt),
    location: location || "Church Hall",
    portalTarget: portalTarget || "leadership",
    createdBy: req.userId,
    notes,
  }).returning();
  res.status(201).json({ ...record, scheduledAt: record.scheduledAt.toISOString(), createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
});

router.patch("/meetings/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  const { status, notes, attendees } = req.body;
  const [record] = await db.update(meetingsTable).set({ status, notes, attendees }).where(eq(meetingsTable.id, id)).returning();
  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...record, scheduledAt: record.scheduledAt.toISOString(), createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
});

router.delete("/meetings/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(meetingsTable).where(eq(meetingsTable.id, id));
  res.json({ success: true });
});

export default router;

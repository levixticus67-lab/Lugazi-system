import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/events", requireAuth, async (_req, res): Promise<void> => {
  const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.date));
  res.json(events.map(e => ({ ...e, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString() })));
});

router.post("/events", requireAuth, requireRole(["admin", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const { title, description, date, time, location, branchId, category } = req.body;
  if (!title || !date || !time || !location || !category) {
    res.status(400).json({ error: "title, date, time, location, category required" }); return;
  }
  const [event] = await db.insert(eventsTable).values({ title, description, date, time, location, branchId, category, createdBy: req.userId }).returning();
  res.status(201).json({ ...event, createdAt: event.createdAt.toISOString(), updatedAt: event.updatedAt.toISOString() });
});

router.patch("/events/:id", requireAuth, requireRole(["admin", "leadership"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { title, description, date, time, location, category } = req.body;
  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (date !== undefined) updateData.date = date;
  if (time !== undefined) updateData.time = time;
  if (location !== undefined) updateData.location = location;
  if (category !== undefined) updateData.category = category;
  const [updated] = await db.update(eventsTable).set(updateData).where(eq(eventsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Event not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/events/:id", requireAuth, requireRole(["admin", "leadership"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.sendStatus(204);
});

export default router;

import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, eventsTable, attendanceTable, usersTable, inAppNotificationsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

router.get("/events", requireAuth, async (_req, res): Promise<void> => {
  const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.date));
  res.json(events.map(e => ({ ...e, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString() })));
});

router.post("/events", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const { title, description, date, time, location, branchId, category } = req.body;
  if (!title || !date || !time || !location || !category) {
    res.status(400).json({ error: "title, date, time, location, category required" }); return;
  }
  const [event] = await db.insert(eventsTable).values({ title, description, date, time, location, branchId, category, createdBy: req.userId }).returning();
  const [actor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await logActivity({ userId: req.userId!, displayName: actor?.displayName ?? "Admin", action: "create_event", entityType: "event", entityId: event.id, entityName: title, ipAddress: req.ip ?? "unknown" });
  // Notify all active users about the new event
  const activeUsers = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.isActive, true));
  const notifyUsers = activeUsers.filter(u => u.id !== req.userId);
  if (notifyUsers.length > 0) {
    const datePart = " on " + date + " at " + time + ".";
    await db.insert(inAppNotificationsTable).values(
      notifyUsers.map(u => ({
        userId: u.id,
        title: "New event: " + title,
        message: "A new " + category + " event has been scheduled: \"" + title + "\"" + datePart,
        relatedEntityType: "event",
        relatedEntityId: event.id,
        eventDate: date ? new Date(date) : null,
      }))
    );
  }
  res.status(201).json({ ...event, createdAt: event.createdAt.toISOString(), updatedAt: event.updatedAt.toISOString() });
});

router.patch("/events/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req, res): Promise<void> => {
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

router.delete("/events/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [existing] = await db.select({ title: eventsTable.title }).from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
  const [actor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await db.delete(attendanceTable).where(eq(attendanceTable.eventId, id));
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  await logActivity({ userId: req.userId!, displayName: actor?.displayName ?? "Admin", action: "delete_event", entityType: "event", entityId: id, entityName: existing?.title, ipAddress: req.ip ?? "unknown" });
  res.sendStatus(204);
});

export default router;
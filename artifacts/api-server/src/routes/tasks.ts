import { Router } from "express";
import { eq, desc, or } from "drizzle-orm";
import { db, tasksTable, usersTable, inAppNotificationsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/tasks", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { userRole, userId } = req;
  let records;
  if (userRole === "admin") {
    records = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
  } else if (userRole === "leadership") {
    records = await db.select().from(tasksTable)
      .where(or(eq(tasksTable.assignedByUserId, userId!), eq(tasksTable.assignedToUserId, userId!)))
      .orderBy(desc(tasksTable.createdAt));
  } else {
    records = await db.select().from(tasksTable)
      .where(eq(tasksTable.assignedToUserId, userId!))
      .orderBy(desc(tasksTable.createdAt));
  }
  res.json(records.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  })));
});

router.post("/tasks", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const { title, description, assignedToUserId, assignedToName, dueDate, priority, category, notes } = req.body;
  if (!title?.trim()) { res.status(400).json({ error: "Title is required" }); return; }
  const [me] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const assignedToId = assignedToUserId ? Number(assignedToUserId) : null;
  const [record] = await db.insert(tasksTable).values({
    title: title.trim(),
    description: description || null,
    assignedToUserId: assignedToId,
    assignedToName: assignedToName || null,
    assignedByUserId: req.userId!,
    assignedByName: me?.displayName || "Leadership",
    dueDate: dueDate || null,
    priority: priority || "medium",
    status: "pending",
    category: category || null,
    notes: notes || null,
  }).returning();
  // Notify the assigned user (skip if assigning to self)
  if (assignedToId && assignedToId !== req.userId) {
    const assigner = me?.displayName ?? "Leadership";
    const duePart = dueDate ? " Due: " + dueDate + "." : "";
    await db.insert(inAppNotificationsTable).values({
      userId: assignedToId,
      title: "New task assigned to you",
      message: assigner + " assigned you a task: \"" + title.trim() + "\"." + duePart,
      relatedEntityType: "task",
      relatedEntityId: record.id,
    });
  }
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), completedAt: null });
});

router.patch("/tasks/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { status, notes, priority, dueDate, title, description } = req.body;
  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (req.userRole !== "admin" && req.userRole !== "leadership") {
    if (existing.assignedToUserId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  }
  const update: Record<string, unknown> = {};
  if (status) { update.status = status; if (status === "completed") update.completedAt = new Date(); else update.completedAt = null; }
  if (notes !== undefined) update.notes = notes;
  if (req.userRole === "admin" || req.userRole === "leadership") {
    if (priority) update.priority = priority;
    if (dueDate !== undefined) update.dueDate = dueDate;
    if (title) update.title = title;
    if (description !== undefined) update.description = description;
  }
  const [updated] = await db.update(tasksTable).set(update).where(eq(tasksTable.id, id)).returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), completedAt: updated.completedAt?.toISOString() ?? null });
});

router.delete("/tasks/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req, res): Promise<void> => {
  const id = Number(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.sendStatus(204);
});

export default router;
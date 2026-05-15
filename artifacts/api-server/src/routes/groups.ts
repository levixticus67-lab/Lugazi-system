import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, groupsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/groups", requireAuth, async (_req, res): Promise<void> => {
  const groups = await db.select().from(groupsTable).orderBy(groupsTable.name);
  res.json(groups.map(g => ({ ...g, createdAt: g.createdAt.toISOString(), updatedAt: g.updatedAt.toISOString() })));
});

router.post("/groups", requireAuth, requireRole(["admin", "leadership"]), async (req, res): Promise<void> => {
  const { name, branchId, leaderName, leaderUserId, location, meetingDay, meetingTime, type, isActive } = req.body;
  if (!name || !branchId) { res.status(400).json({ error: "name and branchId required" }); return; }
  const [group] = await db.insert(groupsTable).values({
    name, branchId, leaderName, leaderUserId: leaderUserId ?? null, location, meetingDay, meetingTime,
    type: type ?? "cell", isActive: isActive ?? true,
  }).returning();
  res.status(201).json({ ...group, createdAt: group.createdAt.toISOString(), updatedAt: group.updatedAt.toISOString() });
});

router.patch("/groups/:id", requireAuth, requireRole(["admin", "leadership"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { name, leaderName, leaderUserId, location, meetingDay, meetingTime, type, isActive, attendees, status, notes } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (leaderName !== undefined) updateData.leaderName = leaderName;
  if (leaderUserId !== undefined) updateData.leaderUserId = leaderUserId;
  if (location !== undefined) updateData.location = location;
  if (meetingDay !== undefined) updateData.meetingDay = meetingDay;
  if (meetingTime !== undefined) updateData.meetingTime = meetingTime;
  if (type !== undefined) updateData.type = type;
  if (isActive !== undefined) updateData.isActive = isActive;
  const [updated] = await db.update(groupsTable).set(updateData).where(eq(groupsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Group not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/groups/:id", requireAuth, requireRole(["admin", "leadership"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(groupsTable).where(eq(groupsTable.id, id));
  res.sendStatus(204);
});

export default router;

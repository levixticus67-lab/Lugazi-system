import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, groupsTable, membersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/groups/my-group", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const myId = req.userId!;
  const groups = await db.select().from(groupsTable).where(eq(groupsTable.leaderUserId, myId));
  if (groups.length === 0) { res.json(null); return; }
  const group = groups[0];
  const groupMembers = await db.select({ id: membersTable.id, fullName: membersTable.fullName, photoUrl: membersTable.photoUrl, role: membersTable.role, phone: membersTable.phone })
    .from(membersTable).where(eq(membersTable.cellGroupId, group.id));
  res.json({ ...group, createdAt: group.createdAt.toISOString(), updatedAt: group.updatedAt.toISOString(), members: groupMembers });
});

router.get("/groups/:id/members", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const members = await db.select({ id: membersTable.id, fullName: membersTable.fullName, photoUrl: membersTable.photoUrl, role: membersTable.role, phone: membersTable.phone })
    .from(membersTable).where(eq(membersTable.cellGroupId, id));
  res.json(members);
});

router.post("/groups/:id/members/:memberId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const groupId = parseInt(req.params.id, 10);
  const memberId = parseInt(req.params.memberId, 10);
  if (isNaN(groupId) || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }
  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }
  if (group.leaderUserId !== req.userId && req.userRole !== "admin" && req.userRole !== "leadership") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await db.update(membersTable)
    .set({ cellGroupId: groupId, cellGroupName: group.name })
    .where(eq(membersTable.id, memberId));
  await db.update(groupsTable).set({ memberCount: group.memberCount + 1 }).where(eq(groupsTable.id, groupId));
  res.json({ success: true });
});

router.delete("/groups/:id/members/:memberId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const groupId = parseInt(req.params.id, 10);
  const memberId = parseInt(req.params.memberId, 10);
  if (isNaN(groupId) || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }
  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }
  if (group.leaderUserId !== req.userId && req.userRole !== "admin" && req.userRole !== "leadership") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await db.update(membersTable)
    .set({ cellGroupId: null, cellGroupName: null })
    .where(eq(membersTable.id, memberId));
  const newCount = Math.max(0, group.memberCount - 1);
  await db.update(groupsTable).set({ memberCount: newCount }).where(eq(groupsTable.id, groupId));
  res.json({ success: true });
});

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
  const { name, leaderName, leaderUserId, location, meetingDay, meetingTime, type, isActive } = req.body;
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
  await db.update(membersTable).set({ cellGroupId: null, cellGroupName: null }).where(eq(membersTable.cellGroupId, id));
  await db.delete(groupsTable).where(eq(groupsTable.id, id));
  res.sendStatus(204);
});

export default router;

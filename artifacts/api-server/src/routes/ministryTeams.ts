import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, ministryTeamsTable, ministryTeamMembersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

router.get("/ministry-teams", requireAuth, async (_req, res): Promise<void> => {
  const teams = await db.select().from(ministryTeamsTable).orderBy(ministryTeamsTable.name);
  const members = await db.select().from(ministryTeamMembersTable);
  res.json(teams.map(t => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    members: members.filter(m => m.teamId === t.id).map(m => ({ ...m, joinedAt: m.joinedAt.toISOString() })),
  })));
});

router.get("/ministry-teams/mine", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const memberships = await db.select().from(ministryTeamMembersTable).where(eq(ministryTeamMembersTable.userId, req.userId!));
  if (memberships.length === 0) { res.json([]); return; }
  const allMembers = await db.select().from(ministryTeamMembersTable);
  const result = [];
  for (const m of memberships) {
    const [team] = await db.select().from(ministryTeamsTable).where(eq(ministryTeamsTable.id, m.teamId)).limit(1);
    if (team) result.push({
      ...team,
      createdAt: team.createdAt.toISOString(),
      myRole: m.role || "Member",
      isLeader: team.leaderId === req.userId,
      members: allMembers.filter(x => x.teamId === team.id).map(x => ({ ...x, joinedAt: x.joinedAt.toISOString() })),
    });
  }
  res.json(result);
});

// admin + pastor only
router.post("/ministry-teams", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const { name, description, leaderId, leaderName } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "Name required" }); return; }
  const [record] = await db.insert(ministryTeamsTable).values({
    name: name.trim(), description: description || null,
    leaderId: leaderId ? Number(leaderId) : null, leaderName: leaderName || null, isActive: true,
  }).returning();
  await logActivity({
    userId: req.userId,
    action: "create_ministry_team",
    entityType: "ministry_team",
    entityId: record.id,
    entityName: name.trim(),
    details: leaderName ? `Leader: ${leaderName}` : undefined,
    ipAddress: req.ip ?? "unknown",
  });
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString(), members: [] });
});

// admin + pastor + leadership
router.patch("/ministry-teams/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { name, description, leaderId, leaderName, isActive } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (leaderId !== undefined) update.leaderId = leaderId;
  if (leaderName !== undefined) update.leaderName = leaderName;
  if (isActive !== undefined && req.userRole === "admin") update.isActive = isActive;
  const [updated] = await db.update(ministryTeamsTable).set(update).where(eq(ministryTeamsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await logActivity({
    userId: req.userId,
    action: "update_ministry_team",
    entityType: "ministry_team",
    entityId: id,
    entityName: updated.name,
    ipAddress: req.ip ?? "unknown",
  });
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// admin + pastor only
router.delete("/ministry-teams/:id", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [existing] = await db.select({ name: ministryTeamsTable.name }).from(ministryTeamsTable).where(eq(ministryTeamsTable.id, id)).limit(1);
  await db.delete(ministryTeamMembersTable).where(eq(ministryTeamMembersTable.teamId, id));
  await db.delete(ministryTeamsTable).where(eq(ministryTeamsTable.id, id));
  await logActivity({
    userId: req.userId,
    action: "delete_ministry_team",
    entityType: "ministry_team",
    entityId: id,
    entityName: existing?.name,
    ipAddress: req.ip ?? "unknown",
  });
  res.sendStatus(204);
});

// admin + pastor + leadership + team leader
router.post("/ministry-teams/:id/members", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const teamId = Number(req.params.id as string);
  const { userId, memberName, role } = req.body;
  if (!userId || !memberName) { res.status(400).json({ error: "userId and memberName required" }); return; }

  const [team] = await db.select().from(ministryTeamsTable).where(eq(ministryTeamsTable.id, teamId)).limit(1);
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  const isLeader = req.userId != null && team.leaderId === req.userId;
  const hasRole = ["admin", "pastor", "leadership"].includes(req.userRole ?? "");
  if (!isLeader && !hasRole) { res.status(403).json({ error: "Forbidden: only the team leader or admin can add members" }); return; }

  const existing = await db.select().from(ministryTeamMembersTable)
    .where(and(eq(ministryTeamMembersTable.teamId, teamId), eq(ministryTeamMembersTable.userId, Number(userId)))).limit(1);
  if (existing.length > 0) { res.status(400).json({ error: "Member already in this team" }); return; }

  const [record] = await db.insert(ministryTeamMembersTable).values({
    teamId, userId: Number(userId), memberName, role: role || "Member",
  }).returning();
  await logActivity({
    userId: req.userId,
    action: "ministry_team_member_added",
    entityType: "ministry_team",
    entityId: teamId,
    entityName: team.name,
    details: `Added: ${memberName} as ${role || "Member"}`,
    ipAddress: req.ip ?? "unknown",
  });
  res.status(201).json({ ...record, joinedAt: record.joinedAt.toISOString() });
});

// admin + pastor + leadership + team leader
router.delete("/ministry-teams/:id/members/:userId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const teamId = Number(req.params.id as string);
  const userId = Number(req.params.userId as string);

  const [team] = await db.select().from(ministryTeamsTable).where(eq(ministryTeamsTable.id, teamId)).limit(1);
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  const isLeader = req.userId != null && team.leaderId === req.userId;
  const hasRole = ["admin", "pastor", "leadership"].includes(req.userRole ?? "");
  if (!isLeader && !hasRole) { res.status(403).json({ error: "Forbidden: only the team leader or admin can remove members" }); return; }

  // Fetch member name before deleting for the log
  const [member] = await db.select({ memberName: ministryTeamMembersTable.memberName })
    .from(ministryTeamMembersTable)
    .where(and(eq(ministryTeamMembersTable.teamId, teamId), eq(ministryTeamMembersTable.userId, userId)))
    .limit(1);

  await db.delete(ministryTeamMembersTable).where(and(eq(ministryTeamMembersTable.teamId, teamId), eq(ministryTeamMembersTable.userId, userId)));
  await logActivity({
    userId: req.userId,
    action: "ministry_team_member_removed",
    entityType: "ministry_team",
    entityId: teamId,
    entityName: team.name,
    details: `Removed: ${member?.memberName ?? `User #${userId}`}`,
    ipAddress: req.ip ?? "unknown",
  });
  res.sendStatus(204);
});

export default router;

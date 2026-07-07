import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, familyMembersTable, membersTable, usersTable, inAppNotificationsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

// GET /family — family records added by the current user
router.get("/family", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const records = await db.select().from(familyMembersTable).where(eq(familyMembersTable.userId, userId));
  res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// GET /family/linked-to-me — records where another member listed me as family (bidirectional)
router.get("/family/linked-to-me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const records = await db.select().from(familyMembersTable).where(eq(familyMembersTable.linkedUserId, userId));

  // Attach the name of the person who added this record
  const ownerIds = [...new Set(records.map(r => r.userId))];
  let ownerNames: Record<number, string> = {};
  if (ownerIds.length > 0) {
    const users = await db.select({ id: usersTable.id, displayName: usersTable.displayName })
      .from(usersTable)
      .where(eq(usersTable.id, ownerIds[0])); // simple for now; works for typical small sets
    // fetch all owners
    const allUsers = await db.select({ id: usersTable.id, displayName: usersTable.displayName }).from(usersTable);
    const idSet = new Set(ownerIds);
    allUsers.filter(u => idSet.has(u.id)).forEach(u => { ownerNames[u.id] = u.displayName; });
  }

  res.json(records.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    addedByName: ownerNames[r.userId] ?? null,
  })));
});

// POST /family — add a family record
router.post("/family", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { fullName, relationship, birthday, phone, email, notes, linkedMemberId, linkedUserId } = req.body;
  if (!fullName || !relationship) { res.status(400).json({ error: "fullName and relationship required" }); return; }

  const [record] = await db.insert(familyMembersTable).values({
    userId: req.userId!,
    fullName,
    relationship,
    birthday,
    phone,
    email,
    notes,
    linkedMemberId: linkedMemberId ?? null,
    linkedUserId: linkedUserId ?? null,
  }).returning();

  // If linked to a real church user, send them an in-app notification
  if (linkedUserId) {
    // Get the adder's display name
    const [adder] = await db.select({ displayName: usersTable.displayName })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    const adderName = adder?.displayName ?? "A church member";

    await db.insert(inAppNotificationsTable).values({
      userId: linkedUserId,
      title: "Family connection added",
      message: `${adderName} has added you as their ${relationship}.`,
      relatedEntityType: "family_member",
      relatedEntityId: record.id,
    });
  }

  await logActivity({
    userId: req.userId,
    displayName: `User #${req.userId}`,
    action: "add_family_member",
    entityType: "family_member",
    entityId: record.id,
    entityName: fullName,
    details: linkedUserId ? `Linked to user #${linkedUserId}` : "Manual entry",
    ipAddress: req.ip ?? "unknown",
  });

  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

// PATCH /family/:id — update a family record
router.patch("/family/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { fullName, relationship, birthday, phone, email, notes, linkedMemberId, linkedUserId } = req.body;

  const [existing] = await db.select().from(familyMembersTable)
    .where(and(eq(familyMembersTable.id, id), eq(familyMembersTable.userId, req.userId!)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const [record] = await db.update(familyMembersTable)
    .set({ fullName, relationship, birthday, phone, email, notes, linkedMemberId, linkedUserId })
    .where(eq(familyMembersTable.id, id))
    .returning();
  if (!record) { res.status(404).json({ error: "Not found" }); return; }

  // Notify newly linked user (if linkedUserId changed to a new value)
  if (linkedUserId && linkedUserId !== existing.linkedUserId) {
    const [adder] = await db.select({ displayName: usersTable.displayName })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    const adderName = adder?.displayName ?? "A church member";

    await db.insert(inAppNotificationsTable).values({
      userId: linkedUserId,
      title: "Family connection updated",
      message: `${adderName} has linked you as their ${relationship}.`,
      relatedEntityType: "family_member",
      relatedEntityId: record.id,
    });
  }

  await logActivity({
    userId: req.userId,
    displayName: `User #${req.userId}`,
    action: "update_family_member",
    entityType: "family_member",
    entityId: record.id,
    entityName: record.fullName,
    details: linkedUserId ? `Linked to user #${linkedUserId}` : undefined,
    ipAddress: req.ip ?? "unknown",
  });

  res.json({ ...record, createdAt: record.createdAt.toISOString() });
});

// DELETE /family/:id
router.delete("/family/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [existing] = await db.select().from(familyMembersTable)
    .where(and(eq(familyMembersTable.id, id), eq(familyMembersTable.userId, req.userId!)))
    .limit(1);

  await db.delete(familyMembersTable).where(eq(familyMembersTable.id, id));

  await logActivity({
    userId: req.userId,
    displayName: `User #${req.userId}`,
    action: "delete_family_member",
    entityType: "family_member",
    entityId: id,
    entityName: existing?.fullName ?? `Family member #${id}`,
    ipAddress: req.ip ?? "unknown",
  });

  res.json({ success: true });
});

// GET /admin/members/:memberId/family — admin: see any member's family records
router.get("/admin/members/:memberId/family", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res): Promise<void> => {
  const memberId = parseInt(req.params.memberId, 10);
  if (isNaN(memberId)) { res.status(400).json({ error: "Invalid member ID" }); return; }

  // Look up the member to get their userId
  const [member] = await db.select({ userId: membersTable.userId, fullName: membersTable.fullName })
    .from(membersTable).where(eq(membersTable.id, memberId)).limit(1);
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }
  if (!member.userId) { res.json([]); return; }

  const records = await db.select().from(familyMembersTable)
    .where(eq(familyMembersTable.userId, member.userId));

  res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

export default router;

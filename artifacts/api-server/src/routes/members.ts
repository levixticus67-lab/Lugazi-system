import { Router } from "express";
import { and, eq, ne } from "drizzle-orm";
import { db, membersTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";
import { v4 as uuidv4 } from "uuid";

const router = Router();

function mergePhoto(memberPhoto: string | null | undefined, userPhoto: string | null | undefined): string | null {
  return userPhoto ?? memberPhoto ?? null;
}

const SENSITIVE_ROLES = ["admin", "leadership", "workforce", "pastor"];

// GET /members — admins are never shown to non-admin callers
router.get("/members", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const isAdmin = req.userRole === "admin";

  // Non-admin callers never see admin-role members
  const whereClause = isAdmin
    ? undefined
    : ne(membersTable.role, "admin");

  const members = whereClause
    ? await db.select().from(membersTable).where(whereClause).orderBy(membersTable.fullName)
    : await db.select().from(membersTable).orderBy(membersTable.fullName);

  const userIds = members.map(m => m.userId).filter((id): id is number => id != null);
  let userPhotoMap: Record<number, string | null> = {};
  if (userIds.length > 0) {
    const allUsers = await db.select({ id: usersTable.id, photoUrl: usersTable.photoUrl }).from(usersTable);
    const idSet = new Set(userIds);
    allUsers.filter(u => idSet.has(u.id)).forEach(u => { userPhotoMap[u.id] = u.photoUrl ?? null; });
  }

  const canSeeSensitive = SENSITIVE_ROLES.includes(req.userRole ?? "member");

  res.json(members.map(m => {
    const base = {
      id: m.id,
      fullName: m.fullName,
      department: m.department,
      profession: m.profession,
      branchId: m.branchId,
      role: m.role,
      isActive: m.isActive,
      photoUrl: mergePhoto(m.photoUrl, m.userId ? userPhotoMap[m.userId] : undefined),
      birthday: m.birthday ?? null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
    if (canSeeSensitive) {
      return { ...base, email: m.email, phone: m.phone, address: m.address, bio: m.bio, birthday: m.birthday, userId: m.userId, qrToken: m.qrToken };
    }
    return base;
  }));
});

router.post("/members", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const { fullName, email, phone, branchId, department, profession, photoUrl, bio, birthday, address } = req.body;
  if (!fullName || !email || !branchId) {
    res.status(400).json({ error: "fullName, email, and branchId are required" }); return;
  }

  // Prevent re-adding members whose accounts have been blocked after deletion
  const [blocked] = await db.select({ id: usersTable.id, isActive: usersTable.isActive }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (blocked && !blocked.isActive) {
    res.status(403).json({ error: "This person has been removed and blocked from re-entry. Contact an admin to reinstate them." }); return;
  }

  const [member] = await db.insert(membersTable).values({
    fullName, email, phone, branchId, department, profession, photoUrl, bio, birthday, address,
    role: "member", qrToken: uuidv4(), isActive: true,
  }).returning();

  await logActivity({
    userId: req.userId,
    displayName: `User #${req.userId}`,
    action: "create_member",
    entityType: "member",
    entityId: member.id,
    entityName: fullName,
    details: email,
    ipAddress: req.ip ?? "unknown",
  });

  res.status(201).json({ ...member, createdAt: member.createdAt.toISOString(), updatedAt: member.updatedAt.toISOString() });
});

// GET /members/:id — admins are invisible to non-admin callers
router.get("/members/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, id)).limit(1);
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  // Hide admin members from non-admin callers entirely
  if (member.role === "admin" && req.userRole !== "admin") {
    res.status(404).json({ error: "Member not found" }); return;
  }

  let userPhoto: string | null = null;
  if (member.userId) {
    const [u] = await db.select({ photoUrl: usersTable.photoUrl }).from(usersTable).where(eq(usersTable.id, member.userId)).limit(1);
    userPhoto = u?.photoUrl ?? null;
  }

  const canSeeSensitive = SENSITIVE_ROLES.includes(req.userRole ?? "member");
  const base = {
    id: member.id,
    fullName: member.fullName,
    department: member.department,
    profession: member.profession,
    branchId: member.branchId,
    role: member.role,
    isActive: member.isActive,
    photoUrl: mergePhoto(member.photoUrl, userPhoto),
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };

  if (canSeeSensitive) {
    res.json({ ...base, email: member.email, phone: member.phone, address: member.address, bio: member.bio, birthday: member.birthday, userId: member.userId, qrToken: member.qrToken });
  } else {
    res.json(base);
  }
});

router.patch("/members/:id", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  // Non-admin cannot edit an admin-role member
  const [target] = await db.select({ role: membersTable.role }).from(membersTable).where(eq(membersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "Member not found" }); return; }
  if (target.role === "admin" && req.userRole !== "admin") {
    res.status(403).json({ error: "You cannot edit an admin account" }); return;
  }

  const { fullName, phone, branchId, department, profession, photoUrl, bio, birthday, address, isActive } = req.body;
  const updateData: Record<string, unknown> = {};
  if (fullName !== undefined) updateData.fullName = fullName;
  if (phone !== undefined) updateData.phone = phone;
  if (branchId !== undefined) updateData.branchId = branchId;
  if (department !== undefined) updateData.department = department;
  if (profession !== undefined) updateData.profession = profession;
  if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
  if (bio !== undefined) updateData.bio = bio;
  if (birthday !== undefined) updateData.birthday = birthday;
  if (address !== undefined) updateData.address = address;
  if (isActive !== undefined && req.userRole === "admin") updateData.isActive = isActive;

  const [updated] = await db.update(membersTable).set(updateData).where(eq(membersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Member not found" }); return; }
  if (photoUrl !== undefined && updated.userId) {
    await db.update(usersTable).set({ photoUrl }).where(eq(usersTable.id, updated.userId)).catch(() => {});
  }
  if (birthday !== undefined) {
    await db.update(membersTable).set({ birthday }).where(eq(membersTable.id, id)).catch(() => {});
  }

  await logActivity({
    userId: req.userId,
    displayName: `User #${req.userId}`,
    action: "update_member",
    entityType: "member",
    entityId: id,
    entityName: updated.fullName,
    details: `Updated: ${Object.keys(updateData).join(", ")}`,
    ipAddress: req.ip ?? "unknown",
  });

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/members/:id", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  // Only admin can delete an admin-role member
  const [target] = await db.select({ fullName: membersTable.fullName, role: membersTable.role, userId: membersTable.userId, email: membersTable.email }).from(membersTable).where(eq(membersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "Member not found" }); return; }
  if (target.role === "admin" && req.userRole !== "admin") {
    res.status(403).json({ error: "You cannot delete an admin account" }); return;
  }

  // Block the linked user account so they cannot log in or be re-added
  if (target.userId) {
    await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, target.userId)).catch(() => {});
  }
  // Also block by email in case the user has no linked account yet
  if (target.email) {
    await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.email, target.email)).catch(() => {});
  }

  await db.delete(membersTable).where(eq(membersTable.id, id));

  await logActivity({
    userId: req.userId,
    displayName: `User #${req.userId}`,
    action: "delete_member",
    entityType: "member",
    entityId: id,
    entityName: target.fullName ?? `Member #${id}`,
    ipAddress: req.ip ?? "unknown",
  });

  res.sendStatus(204);
});

router.get("/members/:id/qr", requireAuth, requireRole(["admin", "pastor", "leadership"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, id)).limit(1);
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }
  res.json({ qrToken: member.qrToken, memberId: member.id, memberName: member.fullName });
});

export default router;

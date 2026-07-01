import { Router } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable, membersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

// GET /users — admin only (unchanged)
router.get("/users", requireAuth, requireRole(["admin"]), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(u => ({ id: u.id, email: u.email, displayName: u.displayName, role: u.role, photoUrl: u.photoUrl, branchId: u.branchId, phone: u.phone, isActive: u.isActive, createdAt: u.createdAt.toISOString() })));
});

// GET /users/:id — own profile or admin; admins invisible to non-admins
router.get("/users/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  // Non-admins can only view their own profile
  if (req.userRole !== "admin" && req.userId !== id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Non-admin somehow requesting an admin account → 404 (not even confirmation it exists)
  if (user.role === "admin" && req.userRole !== "admin") {
    res.status(404).json({ error: "User not found" }); return;
  }

  res.json({ id: user.id, email: user.email, displayName: user.displayName, role: user.role, photoUrl: user.photoUrl, branchId: user.branchId, phone: user.phone, isActive: user.isActive, createdAt: user.createdAt.toISOString() });
});

// PATCH /users/:id — own profile or admin; admins cannot be edited by non-admins
router.patch("/users/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  // Non-admins can only edit their own profile
  if (req.userRole !== "admin" && req.userId !== id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  // Fetch target user to check their role before allowing edit
  const [target] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  // Non-admin cannot edit an admin account (even their own if somehow role was changed externally)
  if (target.role === "admin" && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const { displayName, photoUrl, phone, birthday, branchId, isActive } = req.body;
  const updateData: Record<string, unknown> = {};
  if (displayName !== undefined) updateData.displayName = displayName;
  if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
  if (phone !== undefined) updateData.phone = phone;
  if (birthday !== undefined) updateData.birthday = birthday;
  if (branchId !== undefined && req.userRole === "admin") updateData.branchId = branchId;
  if (isActive !== undefined && req.userRole === "admin") updateData.isActive = isActive;

  const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  if (photoUrl !== undefined) {
    await db.update(membersTable).set({ photoUrl }).where(eq(membersTable.userId, id)).catch(() => {});
  }
  if (birthday !== undefined) {
    await db.update(membersTable).set({ birthday }).where(eq(membersTable.userId, id)).catch(() => {});
  }

  res.json({ id: updated.id, email: updated.email, displayName: updated.displayName, role: updated.role, photoUrl: updated.photoUrl, branchId: updated.branchId, phone: updated.phone, birthday: updated.birthday, isActive: updated.isActive, createdAt: updated.createdAt.toISOString() });
});

// DELETE /users/:id — admin only; cannot delete another admin
router.delete("/users/:id", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  // Prevent an admin from accidentally (or maliciously) deactivating another admin
  if (id === req.userId) {
    res.status(400).json({ error: "You cannot deactivate your own account" }); return;
  }

  const [target] = await db.select({ displayName: usersTable.displayName, email: usersTable.email, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  if (target.role === "admin") {
    res.status(403).json({ error: "Admin accounts can only be managed directly in the database" }); return;
  }

  await db.update(usersTable).set({ role: "member", isActive: false }).where(eq(usersTable.id, id));
  await db.update(membersTable).set({ role: "member", isActive: false }).where(eq(membersTable.userId, id));

  const [adminActor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await logActivity({
    userId: req.userId,
    displayName: adminActor?.displayName ?? "Admin",
    action: "deactivate_user",
    entityType: "user",
    entityId: id,
    entityName: target.displayName ?? `User #${id}`,
    details: `Deactivated ${target.email ?? ""}`,
    ipAddress: req.ip ?? "unknown",
  });

  res.sendStatus(204);
});

// PATCH /users/:id/role — admin only; cannot change another admin's role
router.patch("/users/:id/role", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { role } = req.body;
  if (!role) { res.status(400).json({ error: "Role is required" }); return; }
  const validRoles = ["admin", "pastor", "leadership", "workforce", "member"];
  if (!validRoles.includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }

  // Prevent changing own role (accidental self-demotion)
  if (id === req.userId) {
    res.status(400).json({ error: "You cannot change your own role" }); return;
  }

  // Prevent demoting another admin
  const [target] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target.role === "admin") {
    res.status(403).json({ error: "Admin roles can only be changed directly in the database" }); return;
  }

  const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  await db.update(membersTable).set({ role }).where(eq(membersTable.userId, id));

  const [adminActor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await logActivity({
    userId: req.userId,
    displayName: adminActor?.displayName ?? "Admin",
    action: "change_role",
    entityType: "user",
    entityId: id,
    entityName: updated.displayName,
    details: `Role changed to ${role}`,
    ipAddress: req.ip ?? "unknown",
  });

  res.json({ id: updated.id, email: updated.email, displayName: updated.displayName, role: updated.role, photoUrl: updated.photoUrl, branchId: updated.branchId, phone: updated.phone, isActive: updated.isActive, createdAt: updated.createdAt.toISOString() });
});

// POST /users/:id/reset-password — admin only; cannot reset another admin's password
router.post("/users/:id/reset-password", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [user] = await db.select({ displayName: usersTable.displayName, email: usersTable.email, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (user.role === "admin" && id !== req.userId) {
    res.status(403).json({ error: "Admin passwords can only be reset by the account owner" }); return;
  }

  const digits = Math.floor(100000 + Math.random() * 900000).toString();
  const tempPassword = `DCL${digits}`;
  const hash = await bcrypt.hash(tempPassword, 12);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, id));

  const [adminActor] = await db.select({ displayName: usersTable.displayName })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  await logActivity({
    userId: req.userId!,
    displayName: adminActor?.displayName ?? "Admin",
    action: "reset_password",
    entityType: "user",
    entityId: id,
    entityName: user.displayName,
    details: `Password reset for ${user.email}`,
    ipAddress: req.ip ?? "unknown",
  });

  res.json({ tempPassword, displayName: user.displayName, email: user.email });
});

export default router;

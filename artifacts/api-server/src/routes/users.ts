import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, membersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/users", requireAuth, requireRole(["admin"]), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(u => ({ id: u.id, email: u.email, displayName: u.displayName, role: u.role, photoUrl: u.photoUrl, branchId: u.branchId, phone: u.phone, isActive: u.isActive, createdAt: u.createdAt.toISOString() })));
});

router.get("/users/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  // Members can only view themselves unless admin
  if (req.userRole !== "admin" && req.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, email: user.email, displayName: user.displayName, role: user.role, photoUrl: user.photoUrl, branchId: user.branchId, phone: user.phone, isActive: user.isActive, createdAt: user.createdAt.toISOString() });
});

router.patch("/users/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  // Only admin or self can update
  if (req.userRole !== "admin" && req.userId !== id) {
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

  // Sync birthday to members table if set
  if (birthday !== undefined) {
    await db.update(membersTable).set({ birthday }).where(eq(membersTable.userId, id)).catch(() => {});
  }

  res.json({ id: updated.id, email: updated.email, displayName: updated.displayName, role: updated.role, photoUrl: updated.photoUrl, branchId: updated.branchId, phone: updated.phone, birthday: updated.birthday, isActive: updated.isActive, createdAt: updated.createdAt.toISOString() });
});

router.delete("/users/:id", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  // Downgrade to member role instead of hard delete — preserves data
  await db.update(usersTable).set({ role: "member", isActive: false }).where(eq(usersTable.id, id));
  await db.update(membersTable).set({ role: "member", isActive: false }).where(eq(membersTable.userId, id));
  res.sendStatus(204);
});

// Real-time role change
router.patch("/users/:id/role", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { role } = req.body;
  if (!role) { res.status(400).json({ error: "Role is required" }); return; }
  const validRoles = ["admin", "leadership", "workforce", "member"];
  if (!validRoles.includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }

  const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  // Also sync member record
  await db.update(membersTable).set({ role }).where(eq(membersTable.userId, id));
  res.json({ id: updated.id, email: updated.email, displayName: updated.displayName, role: updated.role, photoUrl: updated.photoUrl, branchId: updated.branchId, phone: updated.phone, isActive: updated.isActive, createdAt: updated.createdAt.toISOString() });
});

export default router;

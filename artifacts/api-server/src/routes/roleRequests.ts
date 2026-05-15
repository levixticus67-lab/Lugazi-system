import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, roleRequestsTable, usersTable, membersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// Admin: list pending role requests
router.get("/role-requests", requireAuth, requireRole(["admin"]), async (_req, res): Promise<void> => {
  const requests = await db.select({
    id: roleRequestsTable.id,
    userId: roleRequestsTable.userId,
    requestedRole: roleRequestsTable.requestedRole,
    currentRole: roleRequestsTable.currentRole,
    reason: roleRequestsTable.reason,
    status: roleRequestsTable.status,
    adminNote: roleRequestsTable.adminNote,
    reviewedAt: roleRequestsTable.reviewedAt,
    createdAt: roleRequestsTable.createdAt,
    userEmail: usersTable.email,
    userDisplayName: usersTable.displayName,
  }).from(roleRequestsTable)
    .leftJoin(usersTable, eq(roleRequestsTable.userId, usersTable.id))
    .orderBy(desc(roleRequestsTable.createdAt));

  res.json(requests.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
  })));
});

// Any authenticated user can submit
router.post("/role-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { requestedRole, reason } = req.body;
  if (!requestedRole) {
    res.status(400).json({ error: "Requested role is required" });
    return;
  }
  const validRoles = ["leadership", "workforce", "member"];
  if (!validRoles.includes(requestedRole)) {
    res.status(400).json({ error: "Invalid role requested" });
    return;
  }
  // Check for existing pending request
  const existing = await db.select().from(roleRequestsTable)
    .where(eq(roleRequestsTable.userId, req.userId!))
    .limit(1);
  const pendingExists = existing.find(r => r.status === "pending");
  if (pendingExists) {
    res.status(400).json({ error: "You already have a pending upgrade request" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const [created] = await db.insert(roleRequestsTable).values({
    userId: req.userId!,
    requestedRole,
    currentRole: user?.role ?? "member",
    reason: reason ?? null,
    status: "pending",
  }).returning();

  res.status(201).json({
    ...created,
    userEmail: user?.email ?? null,
    userDisplayName: user?.displayName ?? null,
    createdAt: created.createdAt.toISOString(),
    reviewedAt: null,
  });
});

// Admin: approve
router.patch("/role-requests/:id/approve", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [request] = await db.select().from(roleRequestsTable).where(eq(roleRequestsTable.id, id)).limit(1);
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }

  const [updated] = await db.update(roleRequestsTable).set({
    status: "approved",
    reviewedAt: new Date(),
  }).where(eq(roleRequestsTable.id, id)).returning();

  // Apply role change in real time
  await db.update(usersTable).set({ role: request.requestedRole }).where(eq(usersTable.id, request.userId));
  await db.update(membersTable).set({ role: request.requestedRole }).where(eq(membersTable.userId, request.userId));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId)).limit(1);

  res.json({
    ...updated,
    userEmail: user?.email ?? null,
    userDisplayName: user?.displayName ?? null,
    createdAt: updated.createdAt.toISOString(),
    reviewedAt: updated.reviewedAt?.toISOString() ?? null,
  });
});

// Admin: reject
router.patch("/role-requests/:id/reject", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { adminNote } = req.body;
  const [updated] = await db.update(roleRequestsTable).set({
    status: "rejected",
    adminNote: adminNote ?? null,
    reviewedAt: new Date(),
  }).where(eq(roleRequestsTable.id, id)).returning();

  if (!updated) { res.status(404).json({ error: "Request not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);

  res.json({
    ...updated,
    userEmail: user?.email ?? null,
    userDisplayName: user?.displayName ?? null,
    createdAt: updated.createdAt.toISOString(),
    reviewedAt: updated.reviewedAt?.toISOString() ?? null,
  });
});

export default router;

import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, roleRequestsTable, usersTable, membersTable, inAppNotificationsTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router = Router();

// Admin: list all role requests
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
  res.json(requests.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), reviewedAt: r.reviewedAt?.toISOString() ?? null })));
});

// Any authenticated user can submit a role request
router.post("/role-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { requestedRole, reason } = req.body;
  if (!requestedRole) { res.status(400).json({ error: "Requested role is required" }); return; }
  const validRoles = ["leadership", "workforce", "member"];
  if (!validRoles.includes(requestedRole)) { res.status(400).json({ error: "Invalid role requested" }); return; }
  const existing = await db.select().from(roleRequestsTable).where(eq(roleRequestsTable.userId, req.userId!)).limit(1);
  if (existing.find(r => r.status === "pending")) { res.status(400).json({ error: "You already have a pending upgrade request" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const [created] = await db.insert(roleRequestsTable).values({
    userId: req.userId!,
    requestedRole,
    currentRole: user?.role ?? "member",
    reason: reason ?? null,
    status: "pending",
  }).returning();
  await logActivity({ userId: req.userId!, displayName: user?.displayName ?? "Member", action: "role_request_submitted", entityType: "role_request", entityId: created.id, entityName: requestedRole, details: reason ?? undefined, ipAddress: req.ip ?? "unknown" });
  // Notify all admins
  const admins = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin"));
  if (admins.length > 0) {
    await db.insert(inAppNotificationsTable).values(
      admins.map(a => ({
        userId: a.id,
        title: "New role upgrade request",
        message: (user?.displayName ?? "A member") + " has requested the " + requestedRole + " role.",
        relatedEntityType: "role_request",
        relatedEntityId: created.id,
      }))
    );
  }
  res.status(201).json({ ...created, userEmail: user?.email ?? null, userDisplayName: user?.displayName ?? null, createdAt: created.createdAt.toISOString(), reviewedAt: null });
});

// Admin: approve a role request
router.patch("/role-requests/:id/approve", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [request] = await db.select().from(roleRequestsTable).where(eq(roleRequestsTable.id, id)).limit(1);
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }
  const [updated] = await db.update(roleRequestsTable).set({ status: "approved", reviewedAt: new Date() }).where(eq(roleRequestsTable.id, id)).returning();
  await db.update(usersTable).set({ role: request.requestedRole }).where(eq(usersTable.id, request.userId));
  await db.update(membersTable).set({ role: request.requestedRole }).where(eq(membersTable.userId, request.userId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId)).limit(1);
  const [adminActor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, (req as AuthRequest).userId!)).limit(1);
  // Notify the requester
  await db.insert(inAppNotificationsTable).values({
    userId: request.userId,
    title: "Role request approved",
    message: "Your request for the " + request.requestedRole + " role has been approved.",
    relatedEntityType: "role_request",
    relatedEntityId: id,
  });
  await logActivity({ userId: (req as AuthRequest).userId!, displayName: adminActor?.displayName ?? "Admin", action: "role_request_approved", entityType: "role_request", entityId: id, entityName: user?.displayName ?? undefined, details: "Approved role: " + request.requestedRole, ipAddress: req.ip ?? "unknown" });
  res.json({ ...updated, userEmail: user?.email ?? null, userDisplayName: user?.displayName ?? null, createdAt: updated.createdAt.toISOString(), reviewedAt: updated.reviewedAt?.toISOString() ?? null });
});

// Admin: reject a role request
router.patch("/role-requests/:id/reject", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { adminNote } = req.body;
  const [updated] = await db.update(roleRequestsTable).set({ status: "rejected", adminNote: adminNote ?? null, reviewedAt: new Date() }).where(eq(roleRequestsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Request not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
  const [rejectActor] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, (req as AuthRequest).userId!)).limit(1);
  // Notify the requester
  const noteText = adminNote ? " Note: " + adminNote : "";
  await db.insert(inAppNotificationsTable).values({
    userId: updated.userId,
    title: "Role request not approved",
    message: "Your request for the " + updated.requestedRole + " role was not approved." + noteText,
    relatedEntityType: "role_request",
    relatedEntityId: id,
  });
  await logActivity({ userId: (req as AuthRequest).userId!, displayName: rejectActor?.displayName ?? "Admin", action: "role_request_rejected", entityType: "role_request", entityId: id, entityName: user?.displayName ?? undefined, details: adminNote ?? undefined, ipAddress: req.ip ?? "unknown" });
  res.json({ ...updated, userEmail: user?.email ?? null, userDisplayName: user?.displayName ?? null, createdAt: updated.createdAt.toISOString(), reviewedAt: updated.reviewedAt?.toISOString() ?? null });
});

export default router;
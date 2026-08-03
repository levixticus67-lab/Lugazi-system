import { Router } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable, membersTable } from "@workspace/db";
import { requireAuth, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// ── GET /admin/sessions?userId=X ──────────────────────────────────────────────
// Returns all active (non-expired) sessions for a given user. Admin only.
router.get("/admin/sessions", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const rawUserId = req.query.userId;
  if (!rawUserId) { res.status(400).json({ error: "userId query param is required" }); return; }
  const userId = parseInt(rawUserId as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "userId must be a number" }); return; }

  const sessions = await db
    .select({
      id:         sessionsTable.id,
      userId:     sessionsTable.userId,
      deviceName: sessionsTable.deviceName,
      ipAddress:  sessionsTable.ipAddress,
      lastSeenAt: sessionsTable.lastSeenAt,
      expiresAt:  sessionsTable.expiresAt,
      createdAt:  sessionsTable.createdAt,
    })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, userId),
        gt(sessionsTable.expiresAt, new Date())
      )
    )
    .orderBy(sessionsTable.lastSeenAt);

  res.json(sessions.map(s => ({
    id:         s.id,
    userId:     s.userId,
    deviceName: s.deviceName ?? "Unknown device",
    ipAddress:  s.ipAddress ?? "Unknown",
    lastSeenAt: s.lastSeenAt.toISOString(),
    expiresAt:  s.expiresAt.toISOString(),
    createdAt:  s.createdAt.toISOString(),
  })));
});

// ── GET /admin/members/:memberId/sessions ─────────────────────────────────────
// Convenience endpoint for the Members page — looks up the member's userId then
// proxies to the sessions query above. Admin only.
router.get("/admin/members/:memberId/sessions", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const memberId = parseInt(req.params.memberId, 10);
  if (isNaN(memberId)) { res.status(400).json({ error: "Invalid memberId" }); return; }

  const [member] = await db
    .select({ userId: membersTable.userId })
    .from(membersTable)
    .where(eq(membersTable.id, memberId))
    .limit(1);

  if (!member) { res.status(404).json({ error: "Member not found" }); return; }
  if (!member.userId) { res.json([]); return; } // no linked user account — no sessions

  const sessions = await db
    .select({
      id:         sessionsTable.id,
      userId:     sessionsTable.userId,
      deviceName: sessionsTable.deviceName,
      ipAddress:  sessionsTable.ipAddress,
      lastSeenAt: sessionsTable.lastSeenAt,
      expiresAt:  sessionsTable.expiresAt,
      createdAt:  sessionsTable.createdAt,
    })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, member.userId),
        gt(sessionsTable.expiresAt, new Date())
      )
    )
    .orderBy(sessionsTable.lastSeenAt);

  res.json(sessions.map(s => ({
    id:         s.id,
    userId:     s.userId,
    deviceName: s.deviceName ?? "Unknown device",
    ipAddress:  s.ipAddress ?? "Unknown",
    lastSeenAt: s.lastSeenAt.toISOString(),
    expiresAt:  s.expiresAt.toISOString(),
    createdAt:  s.createdAt.toISOString(),
  })));
});

// ── DELETE /admin/sessions/:id ────────────────────────────────────────────────
// Force sign-out: deletes the session row so the token is immediately dead.
// Admin only.
router.delete("/admin/sessions/:id", requireAuth, requireRole(["admin", "pastor"]), async (req: AuthRequest, res): Promise<void> => {
  const sessionId = parseInt(req.params.id, 10);
  if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session id" }); return; }

  await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  res.status(204).send();
});

export default router;

import { Router } from "express";
import { eq, and, or, desc, gt, lt, isNull, isNotNull } from "drizzle-orm";
import { db, inAppNotificationsTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

function twoDaysAgo() {
  return new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
}

// GET /notifications/inbox
// Returns notifications visible to the user:
//   • Unread  — always shown
//   • Read within the last 2 days  — still shown so nothing vanishes instantly
//   • Event/meeting notifications  — shown until 2 days after the event date, then auto-deleted
router.get("/notifications/inbox", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const cutoff = twoDaysAgo();

  // Fire-and-forget cleanup: delete rows that are fully past their retention window
  db.delete(inAppNotificationsTable).where(and(
    eq(inAppNotificationsTable.userId, req.userId!),
    or(
      // Regular notifications read more than 2 days ago
      and(
        isNull(inAppNotificationsTable.eventDate),
        eq(inAppNotificationsTable.isRead, true),
        lt(inAppNotificationsTable.readAt, cutoff),
      ),
      // Event/meeting notifications whose event date passed more than 2 days ago
      and(
        isNotNull(inAppNotificationsTable.eventDate),
        lt(inAppNotificationsTable.eventDate, cutoff),
      ),
    ),
  )).catch(() => {});

  const notifications = await db
    .select()
    .from(inAppNotificationsTable)
    .where(and(
      eq(inAppNotificationsTable.userId, req.userId!),
      // Must be unread OR read within the last 2 days
      or(
        eq(inAppNotificationsTable.isRead, false),
        gt(inAppNotificationsTable.readAt, cutoff),
      ),
      // Event notifications must not be past 2 days after their event date
      or(
        isNull(inAppNotificationsTable.eventDate),
        gt(inAppNotificationsTable.eventDate, cutoff),
      ),
    ))
    .orderBy(desc(inAppNotificationsTable.createdAt))
    .limit(50);

  res.json(notifications.map(n => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
    eventDate: n.eventDate?.toISOString() ?? null,
  })));
});

// PATCH /notifications/inbox/:id/read — mark one notification as read
router.patch("/notifications/inbox/:id/read", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db
    .update(inAppNotificationsTable)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(inAppNotificationsTable.id, id),
      eq(inAppNotificationsTable.userId, req.userId!),
    ));

  res.json({ success: true });
});

// PATCH /notifications/inbox/read-all — mark all unread notifications as read
router.patch("/notifications/inbox/read-all", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await db
    .update(inAppNotificationsTable)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(inAppNotificationsTable.userId, req.userId!),
      eq(inAppNotificationsTable.isRead, false),
    ));

  res.json({ success: true });
});

export default router;

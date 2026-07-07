import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, inAppNotificationsTable } from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /notifications/inbox — unread in-app notifications for current user
router.get("/notifications/inbox", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(inAppNotificationsTable)
    .where(and(
      eq(inAppNotificationsTable.userId, req.userId!),
      eq(inAppNotificationsTable.isRead, false),
    ))
    .orderBy(desc(inAppNotificationsTable.createdAt))
    .limit(50);

  res.json(notifications.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })));
});

// PATCH /notifications/inbox/:id/read — mark one as read
router.patch("/notifications/inbox/:id/read", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db
    .update(inAppNotificationsTable)
    .set({ isRead: true })
    .where(and(
      eq(inAppNotificationsTable.id, id),
      eq(inAppNotificationsTable.userId, req.userId!),
    ));

  res.json({ success: true });
});

// PATCH /notifications/inbox/read-all — mark all as read
router.patch("/notifications/inbox/read-all", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await db
    .update(inAppNotificationsTable)
    .set({ isRead: true })
    .where(and(
      eq(inAppNotificationsTable.userId, req.userId!),
      eq(inAppNotificationsTable.isRead, false),
    ));

  res.json({ success: true });
});

export default router;

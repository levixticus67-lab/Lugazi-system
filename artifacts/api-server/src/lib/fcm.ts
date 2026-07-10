import { db, fcmTokensTable, inAppNotificationsTable } from "@workspace/db";
import { eq, and, isNull, gte } from "drizzle-orm";
import { logger } from "./logger";

async function sendFcmPush(
  token: string,
  title: string,
  body: string,
  serverKey: string,
): Promise<void> {
  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "key=" + serverKey,
      },
      body: JSON.stringify({
        to: token,
        notification: { title, body, sound: "default", badge: 1 },
        priority: "high",
        data: { title, body },
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, token: token.slice(0, 12) }, "FCM push failed");
    }
  } catch (err) {
    logger.warn(err, "FCM push network error");
  }
}

async function tick(serverKey: string): Promise<void> {
  try {
    // Only look at notifications from the last 10 minutes that haven't been FCM-sent yet
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const pending = await db
      .select()
      .from(inAppNotificationsTable)
      .where(and(isNull(inAppNotificationsTable.fcmSentAt), gte(inAppNotificationsTable.createdAt, cutoff)))
      .limit(50);

    if (pending.length === 0) return;

    for (const notif of pending) {
      // Mark sent first to avoid duplicate pushes if the worker overlaps
      await db
        .update(inAppNotificationsTable)
        .set({ fcmSentAt: new Date() })
        .where(eq(inAppNotificationsTable.id, notif.id));

      const tokens = await db
        .select({ token: fcmTokensTable.token })
        .from(fcmTokensTable)
        .where(eq(fcmTokensTable.userId, notif.userId));

      for (const { token } of tokens) {
        await sendFcmPush(token, notif.title, notif.message, serverKey);
      }
    }
  } catch (err) {
    logger.error(err, "FCM worker tick error");
  }
}

/**
 * Starts the FCM background worker. Does nothing if FCM_SERVER_KEY is not set,
 * so the app works fine in development or before Firebase is configured.
 */
export function startFcmWorker(): void {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    logger.info("FCM_SERVER_KEY not set — push notifications disabled");
    return;
  }
  logger.info("FCM background worker started (30s interval)");
  tick(serverKey);
  setInterval(() => tick(serverKey), 30_000);
}

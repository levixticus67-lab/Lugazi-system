import admin from "firebase-admin";
import { db, fcmTokensTable, inAppNotificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const PUSH_CHANNEL_ID = "dcl-push";

let _messaging: admin.messaging.Messaging | null = null;

function getMessaging(): admin.messaging.Messaging | null {
  if (_messaging) return _messaging;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;

  try {
    const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    _messaging = admin.messaging();
    return _messaging;
  } catch (err) {
    logger.error(err, "firebase-admin: failed to initialise — check FIREBASE_SERVICE_ACCOUNT");
    return null;
  }
}

/**
 * Sends one FCM push.
 * Returns true if the token is permanently dead and should be deleted from the DB.
 */
async function sendFcmPush(
  token: string,
  title: string,
  body: string,
  messaging: admin.messaging.Messaging,
): Promise<boolean> {
  try {
    await messaging.send({
      token,
      notification: { title, body },
      data: { title, body, channelId: PUSH_CHANNEL_ID },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: PUSH_CHANNEL_ID,
          notificationPriority: "PRIORITY_MAX",
          visibility: "PUBLIC",
          defaultSound: true,
          defaultVibrateTimings: true,
          icon: "ic_launcher",
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { sound: "default", badge: 1, contentAvailable: true } },
      },
    });
    return false;
  } catch (err: any) {
    const code: string = err?.errorInfo?.code ?? err?.code ?? "";
    if (
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered"
    ) {
      // Token is permanently dead — signal the caller to remove it
      return true;
    }
    logger.warn({ code, token: token.slice(0, 12) }, "FCM push failed");
    return false;
  }
}

/**
 * Creates an in-app notification and immediately sends its FCM push.
 *
 * This is intentionally event-triggered: callers invoke it immediately after
 * the business event creates a notification, so there is no database polling
 * loop keeping Neon awake during idle periods.
 *
 * Required env var: FIREBASE_SERVICE_ACCOUNT
 *   → Paste the full contents of your Firebase service account JSON key file.
 *   → Generate one at: Firebase Console → Project Settings → Service Accounts →
 *     "Generate new private key"
 *
 * Does nothing for push delivery if the env var is missing, so the server
 * still works normally in development.
 */
export async function createNotifications(
  values: typeof inAppNotificationsTable.$inferInsert | typeof inAppNotificationsTable.$inferInsert[],
): Promise<void> {
  const notifications = Array.isArray(values) ? values : [values];
  if (notifications.length === 0) return;

  const inserted = await db
    .insert(inAppNotificationsTable)
    .values(notifications)
    .returning({
      id: inAppNotificationsTable.id,
      userId: inAppNotificationsTable.userId,
      title: inAppNotificationsTable.title,
      message: inAppNotificationsTable.message,
    });

  const messaging = getMessaging();
  if (!messaging) {
    return;
  }

  await Promise.all(inserted.map(async (notif) => {
    try {
      const tokens = await db
        .select({ token: fcmTokensTable.token })
        .from(fcmTokensTable)
        .where(eq(fcmTokensTable.userId, notif.userId));

      for (const { token } of tokens) {
        const isStale = await sendFcmPush(token, notif.title, notif.message, messaging);
        if (isStale) {
          await db.delete(fcmTokensTable).where(eq(fcmTokensTable.token, token));
          logger.info({ token: token.slice(0, 12) }, "FCM: deleted stale token from DB");
        }
      }

      await db
        .update(inAppNotificationsTable)
        .set({ fcmSentAt: new Date() })
        .where(eq(inAppNotificationsTable.id, notif.id));
    } catch (err) {
      logger.error({ err, notificationId: notif.id }, "FCM event-triggered push failed");
    }
  }));
}

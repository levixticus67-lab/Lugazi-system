import admin from "firebase-admin";
import { db, fcmTokensTable, inAppNotificationsTable } from "@workspace/db";
import { eq, and, isNull, gte } from "drizzle-orm";
import { logger } from "./logger";

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

async function sendFcmPush(
  token: string,
  title: string,
  body: string,
  messaging: admin.messaging.Messaging,
): Promise<void> {
  try {
    await messaging.send({
      token,
      notification: { title, body },
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "default" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    });
  } catch (err: any) {
    const code: string = err?.errorInfo?.code ?? err?.code ?? "";
    if (
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered"
    ) {
      logger.warn({ token: token.slice(0, 12) }, "FCM token stale/invalid — consider pruning");
    } else {
      logger.warn({ code, token: token.slice(0, 12) }, "FCM push failed");
    }
  }
}

async function tick(messaging: admin.messaging.Messaging): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const pending = await db
      .select()
      .from(inAppNotificationsTable)
      .where(
        and(
          isNull(inAppNotificationsTable.fcmSentAt),
          gte(inAppNotificationsTable.createdAt, cutoff),
        ),
      )
      .limit(50);

    if (pending.length === 0) return;

    for (const notif of pending) {
      await db
        .update(inAppNotificationsTable)
        .set({ fcmSentAt: new Date() })
        .where(eq(inAppNotificationsTable.id, notif.id));

      const tokens = await db
        .select({ token: fcmTokensTable.token })
        .from(fcmTokensTable)
        .where(eq(fcmTokensTable.userId, notif.userId));

      for (const { token } of tokens) {
        await sendFcmPush(token, notif.title, notif.message, messaging);
      }
    }
  } catch (err) {
    logger.error(err, "FCM worker tick error");
  }
}

/**
 * Starts the FCM background worker using the Firebase Admin SDK (FCM HTTP v1 API).
 *
 * Required env var: FIREBASE_SERVICE_ACCOUNT
 *   → Paste the full contents of your Firebase service account JSON key file.
 *   → The service account needs the "Firebase Cloud Messaging API (V1)" permission.
 *   → Generate one at: Firebase Console → Project Settings → Service Accounts →
 *     "Generate new private key"
 *
 * Does nothing if the env var is missing, so the server works fine in dev.
 */
export function startFcmWorker(): void {
  const messaging = getMessaging();
  if (!messaging) {
    logger.info(
      "FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled. " +
        "Set this env var on Render to enable FCM HTTP v1 pushes.",
    );
    return;
  }
  logger.info("FCM worker started — HTTP v1 API via firebase-admin (30 s interval)");
  void tick(messaging);
  setInterval(() => void tick(messaging), 30_000);
}

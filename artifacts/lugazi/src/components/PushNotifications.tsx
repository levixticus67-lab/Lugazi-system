import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import axios from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";

const PUSH_CHANNEL_ID = "dcl-push";

async function ensurePushChannel() {
  try {
    await PushNotifications.createChannel({
      id: PUSH_CHANNEL_ID,
      name: "DC Lugazi Alerts",
      description: "Real-time alerts from DC Lugazi church system",
      importance: 5,
      sound: "default",
      vibration: true,
      lights: true,
      lightColor: "#2563eb",
      visibility: 1,
    });
  } catch {
    // channel already exists or platform doesn't support it — safe to ignore
  }
}

/**
 * Requests push notification permission on native (Android/iOS) and registers
 * the FCM device token with the API. Mount once inside AuthProvider.
 * Does nothing on web or when the user is not logged in.
 *
 * Key behaviours:
 * - Creates a high-importance Android notification channel (dcl-push) so the OS
 *   actually plays sound and shows a heads-up popup.
 * - Re-registers the token on every mount so token rotations are always synced.
 * - Shows a local notification when a push arrives while the app is in the
 *   foreground (FCM suppresses the UI in that case by default).
 */
export default function PushNotificationsSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;

    let active = true;

    async function setup() {
      try {
        // 1. Ensure the high-importance channel exists before registering
        await ensurePushChannel();

        // 2. Request permission
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return;

        // 3. Register (always — so token rotations are synced immediately)
        await PushNotifications.register();

        // 4. Send fresh token to the server
        await PushNotifications.addListener("registration", async (token) => {
          if (!active) return;
          try {
            await axios.post("/api/fcm-tokens", {
              token: token.value,
              platform: Capacitor.getPlatform(),
            });
          } catch {
            // silent — will retry next launch
          }
        });

        // 5. When a push arrives while the app is in the FOREGROUND:
        //    - iOS: FCM suppresses the notification UI, so we fire a local one manually.
        //    - Android 8+ with a high-importance channel: the OS shows the FCM
        //      notification even in foreground, so firing a local one here would
        //      produce a duplicate. We skip it on Android to avoid that.
        await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
          if (!active) return;
          if (Capacitor.getPlatform() !== "ios") return; // Android shows FCM in foreground natively
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Math.floor(Math.random() * 2_000_000) + 1,
                  title: notification.title ?? "DC Lugazi",
                  body: notification.body ?? "",
                  schedule: { at: new Date(Date.now() + 300) },
                  sound: "default",
                  smallIcon: "ic_stat_notification",
                  largeIcon: "ic_launcher",
                  channelId: PUSH_CHANNEL_ID,
                },
              ],
            });
          } catch {
            // local notification failed — non-critical
          }
        });

        // 6. Handle notification tapped while app is in background/closed
        await PushNotifications.addListener("pushNotificationActionPerformed", () => {
          // Could navigate to notifications page here in future
        });
      } catch {
        // Push not supported on this device/emulator — silent fail
      }
    }

    setup();

    return () => {
      active = false;
      PushNotifications.removeAllListeners();
    };
  }, [user?.id]);

  return null;
}

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import axios from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Requests push notification permission on native (Android/iOS) and registers
 * the FCM device token with the API. Mount once inside AuthProvider.
 * Does nothing on web or when the user is not logged in.
 */
export default function PushNotifications() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform() || registered.current) return;
    registered.current = true;

    async function register() {
      try {
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return;

        await PushNotifications.register();

        // Listen for the token from Firebase
        await PushNotifications.addListener("registration", async (token) => {
          try {
            await axios.post("/api/fcm-tokens", {
              token: token.value,
              platform: Capacitor.getPlatform(),
            });
          } catch {
            // silent — will retry next launch
          }
        });

        // Handle notification tapped while app is in background/closed
        await PushNotifications.addListener("pushNotificationActionPerformed", () => {
          // Could navigate to a notifications page here in future
        });
      } catch {
        // Push not supported on this device/emulator — silent fail
      }
    }

    register();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user?.id]);

  return null;
}

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Download, X } from "lucide-react";

const APK_URL =
  "https://github.com/levixticus67-lab/Lugazi-system/releases/download/latest-build/DCLugazi.apk";
const BUILD_DATE = import.meta.env.VITE_BUILD_DATE as string | undefined;
// Use the same base URL axios uses — relative URLs resolve to capacitor://localhost in native
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // check every 30 minutes

async function checkForUpdate(): Promise<boolean> {
  if (!BUILD_DATE) return false;
  try {
    const res = await fetch(`${API_BASE}/api/version`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.version ? new Date(data.version) > new Date(BUILD_DATE) : false;
  } catch {
    return false;
  }
}

export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!BUILD_DATE) return;

    // Check immediately on mount
    checkForUpdate().then((available) => {
      if (available) setUpdateAvailable(true);
    });

    // Then keep polling every 30 minutes while the app is open
    const interval = setInterval(() => {
      checkForUpdate().then((available) => {
        if (available) setUpdateAvailable(true);
      });
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-[100] flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground shadow-lg"
      style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight">Update available</p>
        <p className="text-xs opacity-80 leading-tight">
          A new version of DCL Lugazi is ready
        </p>
      </div>
      <a
        href={APK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        Update
      </a>
      <button
        onClick={() => setDismissed(true)}
        className="text-white/70 hover:text-white transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

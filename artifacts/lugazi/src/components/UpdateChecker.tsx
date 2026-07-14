import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Download, X } from "lucide-react";

const APK_URL =
  "https://github.com/levixticus67-lab/Lugazi-system/releases/download/latest-build/DCLugazi.apk";

// Use the same base URL axios uses — relative URLs resolve to capacitor://localhost in native
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

// Codemagic injects VITE_BUILD_NUMBER=$CM_BUILD_NUMBER into artifacts/lugazi/.env at build time.
// 0 means the app was not built via Codemagic (dev / local build) → skip update checks.
const BUILD_NUMBER = parseInt((import.meta.env.VITE_BUILD_NUMBER as string | undefined) ?? "0", 10);

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // re-check every 30 minutes while app is open

async function checkForUpdate(): Promise<boolean> {
  // No build number baked in → this is a local/dev build, skip silently
  if (!BUILD_NUMBER) return false;
  try {
    const res = await fetch(`${API_BASE}/api/version`);
    if (!res.ok) return false;
    const data = await res.json() as { buildNumber?: number };
    // Show banner only when the server reports a strictly newer build number
    return typeof data.buildNumber === "number" && data.buildNumber > BUILD_NUMBER;
  } catch {
    return false;
  }
}

export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!BUILD_NUMBER) return; // dev build — nothing to check

    // Check immediately on mount
    checkForUpdate().then((available) => {
      if (available) setUpdateAvailable(true);
    });

    // Keep polling every 30 minutes while the app stays open
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

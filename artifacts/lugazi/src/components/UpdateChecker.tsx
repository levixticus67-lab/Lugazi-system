import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Download, X } from "lucide-react";

const APK_URL =
  "https://github.com/levixticus67-lab/Lugazi-system/releases/download/latest-build/DCLugazi.apk";
const BUILD_DATE = import.meta.env.VITE_BUILD_DATE as string | undefined;

export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!BUILD_DATE) return;

    fetch("/api/version")
      .then((r) => r.json())
      .then((data) => {
        if (data.version && new Date(data.version) > new Date(BUILD_DATE)) {
          setUpdateAvailable(true);
        }
      })
      .catch(() => {});
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

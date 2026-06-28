import { useState, useEffect } from "react";

/**
 * Detects if the app is running as an installed PWA (standalone mode).
 *
 * Problem solved: Firebase Google sign-in uses a redirect flow — the browser
 * navigates away to Google and back. That return trip can land in a regular
 * browser tab where display-mode is no longer "standalone", causing the layout
 * to briefly show the desktop/sidebar view instead of the mobile bottom nav.
 *
 * Fix: once we confirm the app is running as a PWA we persist that in
 * localStorage so every page load within the same install (including OAuth
 * redirect returns) gets the right layout immediately.
 */

const STORAGE_KEY = "dcl-is-pwa";

function detect(): boolean {
  if (typeof window === "undefined") return false;
  // Primary signal — Chromium/Android standalone
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari standalone
  if ((window.navigator as any).standalone === true) return true;
  // Persisted from a real standalone session (survives OAuth redirects)
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function useIsPwa(): boolean {
  const [isPwa, setIsPwa] = useState(() => {
    const result = detect();
    // If we're genuinely standalone right now, persist it for redirect returns
    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true)
    ) {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    return result;
  });

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem(STORAGE_KEY, "1");
        setIsPwa(true);
      } else {
        // Only update state if localStorage doesn't say we're a PWA
        // (handles the OAuth redirect-return case)
        if (localStorage.getItem(STORAGE_KEY) !== "1") {
          setIsPwa(false);
        }
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isPwa;
}

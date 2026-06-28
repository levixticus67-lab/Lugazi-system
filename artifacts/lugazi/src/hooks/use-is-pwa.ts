import { useState, useEffect } from "react";

/**
 * Returns true when the app is running as an installed PWA (standalone mode).
 * Returns false when opened in a regular browser tab.
 */
export function useIsPwa(): boolean {
  const [isPwa, setIsPwa] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => setIsPwa(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isPwa;
}

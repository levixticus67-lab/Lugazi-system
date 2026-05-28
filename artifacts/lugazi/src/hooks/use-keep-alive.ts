import { useEffect } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
const PING_INTERVAL_MS = 5 * 60 * 1000;

export function useKeepAlive() {
  useEffect(() => {
    if (!API_BASE) return;

    const ping = () => {
      fetch(`${API_BASE}/api/healthz`, { method: "GET", cache: "no-store" }).catch(() => {});
    };

    ping();
    const id = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}

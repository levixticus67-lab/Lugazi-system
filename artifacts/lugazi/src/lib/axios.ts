import axios from "axios";
import { Capacitor } from "@capacitor/core";

// Point axios at the Render API for all direct axios calls
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

// Send cookies on every cross-origin request (required for HttpOnly auth cookie)
axios.defaults.withCredentials = true;

// ── JWT helpers ───────────────────────────────────────────────────────────────

function getStoredToken(): string | null {
  return localStorage.getItem("dcl_token_jwt");
}

function storeToken(token: string): void {
  localStorage.setItem("dcl_token_jwt", token);
}

/** Decode JWT payload without verifying signature — just to read the exp claim. */
function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Refresh when < 12 hours remain on the current token
const REFRESH_THRESHOLD_MS = 12 * 60 * 60 * 1000;

// ── Bearer token interceptor ──────────────────────────────────────────────────
// Always attach the stored JWT as an Authorization header when available.
// On native (Android WebView), HttpOnly cookies from a remote domain don't
// persist reliably across requests, so the header is the primary auth mechanism.
// On web (browser), cookies work when available; the header acts as a fallback
// for cross-origin scenarios such as incognito mode where third-party cookies
// are blocked.
axios.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Token refresh ─────────────────────────────────────────────────────────────

let _refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await axios.post<{ token: string }>("/api/auth/refresh");
    const newToken = res.data.token;
    storeToken(newToken);
    return newToken;
  } catch {
    return null;
  }
}

/** Deduplicated refresh — concurrent callers share the same in-flight request. */
function refreshToken(): Promise<string | null> {
  if (!_refreshPromise) {
    _refreshPromise = doRefresh().finally(() => {
      _refreshPromise = null;
    });
  }
  return _refreshPromise;
}

/**
 * Proactively refresh the stored JWT if it has less than REFRESH_THRESHOLD_MS
 * remaining.  Safe to call on app start and on every Capacitor resume event.
 */
export async function proactiveRefresh(): Promise<void> {
  const token = getStoredToken();
  if (!token) return;
  const expiry = getTokenExpiryMs(token);
  if (!expiry) return;
  const remaining = expiry - Date.now();
  if (remaining < REFRESH_THRESHOLD_MS) {
    await refreshToken();
  }
}

// ── 401 → refresh → retry interceptor ────────────────────────────────────────
// When any request returns 401:
//   1. Attempt a silent token refresh (one try, deduplicated).
//   2. If refresh succeeds → retry the original request once with the new token.
//   3. If refresh fails → clear local session and redirect to login.
axios.interceptors.response.use(
  (res) => res,
  async (err) => {
    const url: string = err.config?.url ?? "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/me") ||
      url.includes("/auth/refresh");

    if (
      err.response?.status === 401 &&
      !isAuthEndpoint &&
      !(err.config as Record<string, unknown>)?._retried
    ) {
      const newToken = await refreshToken();

      if (newToken) {
        const config = err.config as Record<string, unknown>;
        config._retried = true;
        const headers = (config.headers as Record<string, string>) ?? {};
        headers.Authorization = `Bearer ${newToken}`;
        config.headers = headers;
        return axios(err.config);
      }
    }

    // Refresh failed or exhausted. On Capacitor native the httpOnly refresh
    // cookie is not forwarded cross-origin, so refresh always fails even with
    // a valid JWT. Only wipe the session when the token is genuinely expired
    // (or absent) — not on every transient 401 + failed refresh.
    if (err.response?.status === 401 && !isAuthEndpoint) {
      const storedToken = localStorage.getItem("dcl_token_jwt");
      const expiry = storedToken ? getTokenExpiryMs(storedToken) : null;
      if (!expiry || expiry < Date.now()) {
        // Token is expired or absent — session is genuinely invalid
        localStorage.removeItem("dcl_user");
        localStorage.removeItem("dcl_token_jwt");
        window.location.href = "/login";
      }
      // Token still valid → transient server issue, let caller handle the rejection
    }

    return Promise.reject(err);
  }
);

export default axios;

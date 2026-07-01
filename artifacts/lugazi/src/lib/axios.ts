import axios from "axios";
import { Capacitor } from "@capacitor/core";

  // Point axios at the Render API for all direct axios calls
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

  // Send cookies on every cross-origin request (required for HttpOnly auth cookie)
  axios.defaults.withCredentials = true;

  // For Capacitor native: attach the stored JWT as a Bearer token.
  // HttpOnly cookies from a remote domain don't persist reliably in the Android
  // WebView's cross-origin context, so we fall back to the Authorization header
  // which the requireAuth middleware already accepts as a fallback.
  axios.interceptors.request.use((config) => {
    if (Capacitor.isNativePlatform()) {
      const token = localStorage.getItem("dcl_token_jwt");
      if (token) {
        config.headers = config.headers ?? {};
        (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  // Global 401 handler — redirect to login when session expires.
  // Skipped for auth endpoints to avoid redirect loops.
  axios.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        const url: string = err.config?.url ?? "";
        const isAuthEndpoint =
          url.includes("/auth/login") ||
          url.includes("/auth/register") ||
          url.includes("/auth/me");
        if (!isAuthEndpoint) {
          localStorage.removeItem("dcl_user");
          localStorage.removeItem("dcl_token_jwt");
          window.location.href = "/login";
        }
      }
      return Promise.reject(err);
    }
  );

  export default axios;

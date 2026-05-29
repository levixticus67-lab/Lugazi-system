import axios from "axios";

  // Point axios at the Render API for all direct axios calls
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

  // Send cookies on every cross-origin request (required for HttpOnly auth cookie)
  axios.defaults.withCredentials = true;

  // Global 401 handler — redirect to login when session expires.
  // Skipped for auth endpoints to avoid redirect loops (login wrong password,
  // or the initial /auth/me check when there is no session yet).
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
          window.location.href = "/login";
        }
      }
      return Promise.reject(err);
    }
  );

  export default axios;
  
import axios from "axios";

  // Send cookies on every cross-origin request (required for HttpOnly auth cookie)
  axios.defaults.withCredentials = true;

  // Global 401 handler — redirect to login when session expires.
  // Skipped for auth endpoints themselves to avoid infinite redirect loops.
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
  
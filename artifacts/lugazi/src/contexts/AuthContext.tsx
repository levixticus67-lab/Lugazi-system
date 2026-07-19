import { createContext, useContext, useState, useEffect, ReactNode } from "react";
  import axios from "@/lib/axios";

  export interface AuthUser {
    id: number;
    email: string;
    displayName: string;
    role: "admin" | "pastor" | "leadership" | "workforce" | "member";
    photoUrl?: string | null;
    branchId?: number | null;
    phone?: string | null;
    isActive: boolean;
    createdAt: string;
  }

  interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    login: (token: string, user: AuthUser) => void;
    logout: () => void;
    updateUser: (updates: Partial<AuthUser>) => void;
    isLoading: boolean;
  }

  const PORTAL_MAP: Record<string, string> = {
    admin: "/admin/dashboard",
    pastor: "/pastor/dashboard",
    leadership: "/leadership/dashboard",
    workforce: "/workforce/dashboard",
    member: "/member/dashboard",
  };

  const AuthContext = createContext<AuthContextValue | null>(null);

  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const storedUser = localStorage.getItem("dcl_user");

      if (!storedUser) {
        setIsLoading(false);
        return;
      }

      let cached: AuthUser | null = null;
      try {
        cached = JSON.parse(storedUser) as AuthUser;
        setUser(cached);
        setToken(String(cached.id));
      } catch {
        localStorage.removeItem("dcl_user");
        setIsLoading(false);
        return;
      }

      const cachedRole = cached?.role;

      axios
        .get<AuthUser>("/api/auth/me")
        .then((res) => {
          const fresh = res.data;
          localStorage.setItem("dcl_user", JSON.stringify(fresh));
          setUser(fresh);
          setToken(String(fresh.id));

          // Role changed since last session — redirect to the correct portal immediately.
          if (cachedRole && cachedRole !== fresh.role) {
            const destination = PORTAL_MAP[fresh.role] ?? "/login";
            window.location.href = destination;
          }
        })
        .catch((err: unknown) => {
          // Only clear session on definitive auth rejection (401/403).
          // Network errors or server errors (5xx) on Capacitor/slow connections
          // should keep the cached user — losing the session on a bad network
          // frame is worse than keeping a stale session.
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 401 || status === 403) {
            localStorage.removeItem("dcl_user");
            localStorage.removeItem("dcl_token_jwt");
            setUser(null);
            setToken(null);
          }
          // For all other errors keep the cached user; isLoading will be cleared in .finally()
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, []);

    function login(newToken: string, newUser: AuthUser) {
      localStorage.setItem("dcl_user", JSON.stringify(newUser));
      // Store raw JWT so the axios interceptor can send it as a Bearer token
      // on Capacitor native, where cross-origin HttpOnly cookies are unreliable.
      if (newToken) localStorage.setItem("dcl_token_jwt", newToken);
      setUser(newUser);
      setToken(String(newUser.id));
    }

    async function logout() {
      try {
        await axios.post("/api/auth/logout");
      } catch {
        // Proceed with local cleanup even if the server call fails
      }
      localStorage.removeItem("dcl_user");
      localStorage.removeItem("dcl_token_jwt");
      setUser(null);
      setToken(null);
      window.location.href = "/login";
    }

    function updateUser(updates: Partial<AuthUser>) {
      if (!user) return;
      const updated = { ...user, ...updates };
      localStorage.setItem("dcl_user", JSON.stringify(updated));
      setUser(updated);
    }

    return (
      <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
        {children}
      </AuthContext.Provider>
    );
  }

  export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
  }

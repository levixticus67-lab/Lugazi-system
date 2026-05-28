import { createContext, useContext, useState, useEffect, ReactNode } from "react";
  import axios from "@/lib/axios";

  export interface AuthUser {
    id: number;
    email: string;
    displayName: string;
    role: "admin" | "leadership" | "workforce" | "member";
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

  const AuthContext = createContext<AuthContextValue | null>(null);

  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    // token is a truthy marker only — the real JWT lives in the HttpOnly cookie.
    // Components that check `if (!token)` continue to work without change.
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // Pre-populate from cached user for instant render while we verify the session
      const storedUser = localStorage.getItem("dcl_user");
      if (storedUser) {
        try {
          const parsed: AuthUser = JSON.parse(storedUser);
          setUser(parsed);
          setToken(String(parsed.id));
        } catch {
          localStorage.removeItem("dcl_user");
        }
      }

      // Verify / refresh session via the HttpOnly cookie (withCredentials is set globally)
      axios
        .get<AuthUser>("/api/auth/me")
        .then((res) => {
          const fresh = res.data;
          localStorage.setItem("dcl_user", JSON.stringify(fresh));
          setUser(fresh);
          setToken(String(fresh.id));
        })
        .catch(() => {
          // Cookie missing or expired — clear local state and let user re-login
          localStorage.removeItem("dcl_user");
          setUser(null);
          setToken(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, []);

    function login(_newToken: string, newUser: AuthUser) {
      // The real JWT is now in the HttpOnly cookie set by the server.
      // We only cache user data locally for fast subsequent renders.
      localStorage.setItem("dcl_user", JSON.stringify(newUser));
      setUser(newUser);
      setToken(String(newUser.id));
    }

    async function logout() {
      try {
        // Ask the server to clear the HttpOnly cookie
        await axios.post("/api/auth/logout");
      } catch {
        // Proceed with local cleanup even if the server call fails
      }
      localStorage.removeItem("dcl_user");
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
  
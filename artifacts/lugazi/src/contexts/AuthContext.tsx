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
          // This handles the case where an admin upgraded/downgraded this user's role.
          if (cachedRole && cachedRole !== fresh.role) {
            const destination = PORTAL_MAP[fresh.role] ?? "/login";
            window.location.href = destination;
          }
        })
        .catch(() => {
          localStorage.removeItem("dcl_user");
          setUser(null);
          setToken(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, []);

    function login(_newToken: string, newUser: AuthUser) {
      localStorage.setItem("dcl_user", JSON.stringify(newUser));
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

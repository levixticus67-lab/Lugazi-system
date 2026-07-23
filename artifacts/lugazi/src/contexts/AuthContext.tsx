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

// M7 fix: versioned cache envelope with expiry.
// Bumping CACHE_VERSION invalidates all existing cached sessions (e.g. after
// a breaking schema change). MAX_CACHE_AGE_MS prevents stale data persisting
// indefinitely on devices that are rarely opened.
const CACHE_VERSION = 1;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface UserCacheEnvelope {
  data: AuthUser;
  cachedAt: number;
  version: number;
}

function readCachedUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem("dcl_user");
    if (!stored) return null;
    const parsed = JSON.parse(stored) as unknown;
    // Support both old format (plain user object) and new envelope format
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "data" in parsed &&
      "cachedAt" in parsed &&
      "version" in parsed
    ) {
      const envelope = parsed as UserCacheEnvelope;
      if (envelope.version !== CACHE_VERSION) {
        localStorage.removeItem("dcl_user");
        return null;
      }
      if (Date.now() - envelope.cachedAt > MAX_CACHE_AGE_MS) {
        localStorage.removeItem("dcl_user");
        return null;
      }
      return envelope.data;
    }
    // Old format — treat as valid but immediately refresh from server
    return parsed as AuthUser;
  } catch {
    localStorage.removeItem("dcl_user");
    return null;
  }
}

function writeCachedUser(user: AuthUser): void {
  const envelope: UserCacheEnvelope = {
    data: user,
    cachedAt: Date.now(),
    version: CACHE_VERSION,
  };
  localStorage.setItem("dcl_user", JSON.stringify(envelope));
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cached = readCachedUser();

    if (!cached) {
      setIsLoading(false);
      return;
    }

    const cachedRole = cached.role;
    setUser(cached);
    setToken(String(cached.id));

    axios
      .get<AuthUser>("/api/auth/me")
      .then((res) => {
        const fresh = res.data;
        writeCachedUser(fresh);
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
        // For all other errors keep the cached user; isLoading cleared in .finally()
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  function login(newToken: string, newUser: AuthUser) {
    writeCachedUser(newUser);
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
    writeCachedUser(updated);
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

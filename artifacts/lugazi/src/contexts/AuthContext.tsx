import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("dcl_token");
    const storedUser = localStorage.getItem("dcl_user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("dcl_token");
        localStorage.removeItem("dcl_user");
      }
    }
    setIsLoading(false);
  }, []);

  function login(newToken: string, newUser: AuthUser) {
    localStorage.setItem("dcl_token", newToken);
    localStorage.setItem("dcl_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem("dcl_token");
    localStorage.removeItem("dcl_user");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

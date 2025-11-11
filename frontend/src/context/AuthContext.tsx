import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../services/auth";

//type User = { id?: string; email?: string; username?: string } | null;

type AuthState = {
  user: User | null;
  token: string;
  login: (payload: { user?: User; token: string }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const t = localStorage.getItem("access_token") || "";
    const u = localStorage.getItem("user");
    if (t) setToken(t);
    if (u) setUser(JSON.parse(u));
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    token,
    login: ({ user: u, token: t }) => {
      setToken(t);
      if (t) localStorage.setItem("access_token", t);
      if (u) {
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
      }
    },
    logout: () => {
      setUser(null);
      setToken("");
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    },
  }), [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

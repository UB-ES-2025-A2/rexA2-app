import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../services/auth";

type AuthState = {
  user: User | null;
  token: string;
  login: (payload: { user?: User; token: string }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const API = import.meta.env.VITE_API_URL || window.location.origin;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem("user");
    if (u) {
      try {
        const parsed = JSON.parse(u);
        console.log("[AUTH] init user from localStorage", parsed);
        return parsed;
      } catch (err) {
        console.error("[AUTH] error parsing user from localStorage", err);
      }
    }
    return null;
  });

  const [token, setToken] = useState<string>(() => {
    const t = localStorage.getItem("access_token") || "";
    if (t) {
      console.log("[AUTH] init token from localStorage", t);
    }
    return t;
  });

  // 2) Si tenemos token pero no user, pedir /auth/me
  useEffect(() => {
    const shouldFetchMe = !!token && !user;

    if (!shouldFetchMe) return;

    console.log("[AUTH] no user but token exists, fetching /auth/me");

    let cancelled = false;

    const fetchMe = async () => {
      try {
        const res = await fetch(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        console.log("[AUTH] /auth/me response", {
          status: res.status,
          ok: res.ok,
        });

        if (!res.ok) {
          console.warn("[AUTH] /auth/me not ok");
          return;
        }

        const me = await res.json();
        if (cancelled) {
          console.log("[AUTH] /auth/me cancelled, ignoring data");
          return;
        }

        console.log("[AUTH] /auth/me data", me);

        setUser(me as User);
        localStorage.setItem("user", JSON.stringify(me));
      } catch (err) {
        if (cancelled) return;
        console.error("[AUTH] error fetching /auth/me", err);
      }
    };

    fetchMe();

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  // 3) Log de cambios de estado
  useEffect(() => {
    console.log("[AUTH] state changed", { user, token });
  }, [user, token]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      login: ({ user: u, token: t }) => {
        console.log("[AUTH] login called", { rawUser: u, rawToken: t });

        setToken(t);
        if (t) {
          localStorage.setItem("access_token", t);
          console.log("[AUTH] token saved to localStorage", t);
        }

        // Si el login algún día devuelve también user, lo aprovechamos.
        if (u) {
          setUser(u);
          localStorage.setItem("user", JSON.stringify(u));
          console.log("[AUTH] user saved to localStorage from login", u);
        } else {
          console.warn(
            "[AUTH] login called WITHOUT user; /auth/me se encargará de rellenarlo si hace falta."
          );
        }
      },
      logout: () => {
        console.log("[AUTH] logout called");
        setUser(null);
        setToken("");
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        console.log("[AUTH] localStorage cleared");
      },
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

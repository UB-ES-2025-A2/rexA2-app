import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export function useRequireAuth(openAuth: (mode?: "login" | "signup") => void) {
  const { user, token } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const requireAuth = async <T>(action: () => T | Promise<T>) => {
    if (user || token) {
      return await action();
    } else {
      if (!isChecking) {
        setIsChecking(true);
        openAuth("login");
        setTimeout(() => setIsChecking(false), 1000);
      }
    }
  };

  return { requireAuth };
}

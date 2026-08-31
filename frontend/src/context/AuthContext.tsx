/* eslint-disable react-refresh/only-export-components -- provider + hook vivem juntos de propósito */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, ApiError } from "../lib/api";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "manager" | "employee" | "admin";
  mustChangePassword: boolean;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await apiFetch<User>("/me"));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch<User>("/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((err) => {
        if (!cancelled) {
          setUser(null);
          if (!(err instanceof ApiError)) console.error(err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const me = await apiFetch<User>("/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/logout", { method: "POST" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "../types";
import { getSupabase } from "../lib/supabase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const sb = await getSupabase();
    const token = (await sb.auth.getSession()).data.session?.access_token;
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    getSupabase().then((sb) => {
      if (cancelled) return;
      sb.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          refreshUser().finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      });

      sb.auth.onAuthStateChange((_event, session) => {
        if (session) {
          refreshUser();
        } else {
          setUser(null);
        }
      });
    });
    return () => { cancelled = true; };
  }, []);

  const login = async (email: string, password: string) => {
    const sb = await getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await refreshUser();
  };

  const register = async (email: string, password: string) => {
    const sb = await getSupabase();
    const { error } = await sb.auth.signUp({ email, password });
    if (error) throw error;

    const token = (await sb.auth.getSession()).data.session?.access_token;
    if (token) {
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, password }),
      });
    }
    await refreshUser();
  };

  const logout = async () => {
    const sb = await getSupabase();
    await sb.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

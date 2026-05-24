import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { User } from "../types";
import { getAuthInstance } from "../lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<User | null> | null>(null);

  const getToken = async (): Promise<string | null> => {
    const auth = await getAuthInstance();
    const fbUser = auth.currentUser;
    if (fbUser) {
      try {
        return await fbUser.getIdToken();
      } catch {
        return null;
      }
    }
    return null;
  };

  const refreshUser = async (): Promise<User | null> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    refreshPromiseRef.current = doRefresh();
    try {
      return await refreshPromiseRef.current;
    } finally {
      refreshPromiseRef.current = null;
    }
  };

  const doRefresh = async (): Promise<User | null> => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return data;
      }
      const errBody = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
      console.error("refreshUser failed:", res.status, errBody);
      setUser(null);
      return null;
    } catch (err) {
      console.error("refreshUser error:", err);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    getAuthInstance().then((auth) => {
      if (cancelled) return;
      const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          refreshUser().finally(() => {
            if (!cancelled) setLoading(false);
          });
        } else {
          if (!cancelled) {
            setUser(null);
            setLoading(false);
          }
        }
      });
      return () => {
        unsubscribe();
        cancelled = true;
      };
    });
    return () => { cancelled = true; };
  }, []);

  const login = async (email: string, password: string) => {
    const auth = await getAuthInstance();
    await signInWithEmailAndPassword(auth, email, password);
    const u = await refreshUser();
    if (!u) {
      await signOut(auth);
      throw new Error("Login failed. Make sure your email is verified and try again.");
    }
  };

  const register = async (email: string, password: string) => {
    const auth = await getAuthInstance();
    let user: FirebaseUser;

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      user = cred.user;
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
      } else {
        throw err;
      }
    }

    await sendEmailVerification(user, {
      url: `${window.location.origin}/login`,
      handleCodeInApp: false,
    });

    const token = await user.getIdToken();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      await signOut(auth);
      throw new Error("Email already registered. Try resetting your password.");
    }

    await signOut(auth);
  };

  const logout = async () => {
    const auth = await getAuthInstance();
    await signOut(auth);
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

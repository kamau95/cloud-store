import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  const refreshUser = async () => {
    const token = await getToken();
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
    await refreshUser();
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

    await sendEmailVerification(user);

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

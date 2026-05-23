import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getAuthInstance } from "../lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import AdminLogin from "./pages/Login";
import AdminDashboard from "../pages/AdminDashboard";
import AdminProducts from "../pages/AdminProducts";
import AdminOrders from "../pages/AdminOrders";
import AdminUsers from "../pages/AdminUsers";
import AdminAccounts from "../pages/AdminAccounts";
import Forbidden from "../pages/Forbidden";

function useAdminAuth() {
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAuthInstance().then((auth) => {
      if (cancelled) return;
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          const token = await fbUser.getIdToken();
          try {
            const res = await fetch("/api/auth/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const profile = await res.json();
              if (!cancelled) setUser(profile);
            }
          } catch {}
        }
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
      });
      return () => {
        unsubscribe();
        cancelled = true;
      };
    });
    return () => { cancelled = true; };
  }, []);

  return { user, loading };
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="login" replace />;
  if (user.role !== "TOP") return <Forbidden />;
  return <>{children}</>;
}

export default function AdminApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AuthGuard><AdminDashboard /></AuthGuard>} />
        <Route path="products" element={<AuthGuard><AdminProducts /></AuthGuard>} />
        <Route path="orders" element={<AuthGuard><AdminOrders /></AuthGuard>} />
        <Route path="users" element={<AuthGuard><AdminUsers /></AuthGuard>} />
        <Route path="accounts" element={<AuthGuard><AdminAccounts /></AuthGuard>} />
        <Route path="*" element={<Forbidden />} />
      </Routes>
    </BrowserRouter>
  );
}

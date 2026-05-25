import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminLogin from "./pages/Login";
import AdminDashboard from "../pages/AdminDashboard";
import AdminProducts from "../pages/AdminProducts";
import AdminOrders from "../pages/AdminOrders";
import AdminAccounts from "../pages/AdminAccounts";
import AdminUsers from "../pages/AdminUsers";
import Forbidden from "../pages/Forbidden";

const base = "/" + (window.location.pathname.split("/").filter(Boolean)[0] || "admin");

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "TOP") return <Forbidden />;
  return <>{children}</>;
}

export default function AdminApp() {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  return (
    <BrowserRouter basename={base}>
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

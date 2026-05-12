import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-white tracking-tight">
                Cloud<span className="text-blue-500">Store</span>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link to="/products" className="text-gray-300 hover:text-white transition text-sm">Products</Link>
                {user && <Link to="/orders" className="text-gray-300 hover:text-white transition text-sm">My Orders</Link>}
                {user?.role === "ADMIN" && (
                  <Link to="/admin" className="text-amber-400 hover:text-amber-300 transition text-sm font-medium">Admin</Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-400">{user.email}</span>
                  <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-gray-300 hover:text-white transition">Login</Link>
                  <Link to="/register" className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition">Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

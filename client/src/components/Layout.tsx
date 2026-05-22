import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" onClick={closeMenu} className="text-xl font-bold text-white tracking-tight">
                Cloud<span className="text-blue-500">Store</span>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link to="/products" className="text-gray-300 hover:text-white transition text-sm">Products</Link>
                {user && <Link to="/orders" className="text-gray-300 hover:text-white transition text-sm">My Orders</Link>}
                {(user?.role === "MID" || user?.role === "TOP") && (
                  <Link to="/admin" className="text-amber-400 hover:text-amber-300 transition text-sm font-medium">Admin</Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="hidden sm:inline text-sm text-gray-400">{user.email}</span>
                  <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hidden sm:inline text-sm text-gray-300 hover:text-white transition">Login</Link>
                  <Link to="/register" className="hidden sm:inline text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition">Register</Link>
                </>
              )}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 text-gray-400 hover:text-white transition"
                aria-label="Toggle menu"
              >
                {menuOpen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-gray-900 px-4 py-4 space-y-3">
            <Link to="/products" onClick={closeMenu} className="block text-gray-300 hover:text-white transition text-sm">Products</Link>
            {user && <Link to="/orders" onClick={closeMenu} className="block text-gray-300 hover:text-white transition text-sm">My Orders</Link>}
            {(user?.role === "MID" || user?.role === "TOP") && (
              <Link to="/admin" onClick={closeMenu} className="block text-amber-400 hover:text-amber-300 transition text-sm font-medium">Admin</Link>
            )}
            {!user && (
              <div className="flex gap-3 pt-2">
                <Link to="/login" onClick={closeMenu} className="text-sm text-gray-300 hover:text-white transition">Login</Link>
                <Link to="/register" onClick={closeMenu} className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition">Register</Link>
              </div>
            )}
          </div>
        )}
      </nav>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

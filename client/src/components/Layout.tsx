import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [social, setSocial] = useState({ telegramUrl: "", whatsappUrl: "" });

  useEffect(() => {
    api.get<{ telegramUrl: string; whatsappUrl: string }>("/settings")
      .then(setSocial)
      .catch(() => {});
  }, []);

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
                {user?.role === "MID" && (
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
            {user?.role === "MID" && (
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
      <footer className="border-t border-gray-800 bg-gray-900/60 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <p className="text-sm text-gray-500">CloudStore</p>
          <div className="flex items-center gap-4">
            {social.telegramUrl && (
              <a href={social.telegramUrl} target="_blank" rel="noopener noreferrer" className="text-[#229ED9] hover:text-[#4FC3F7] transition" aria-label="Telegram">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            )}
            {social.whatsappUrl && (
              <a href={social.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:text-[#6DE18D] transition" aria-label="WhatsApp">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

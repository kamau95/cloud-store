import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { AuthResponse } from "../types";
import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post<AuthResponse>("/auth/login", { email, password });
      login(data.token, data.user);
      toast.success("Logged in");
      navigate("/products");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-3xl font-bold mb-8 text-center">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 rounded-lg font-medium transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        Don't have an account? <Link to="/register" className="text-blue-400 hover:underline">Register</Link>
      </p>
    </div>
  );
}

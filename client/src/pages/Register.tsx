import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { friendlyError } from "../lib/errors";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password);
      setSent(true);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Account created</h1>
        <p className="text-gray-400 mb-8">
          Your account for <span className="text-white">{email}</span> is ready.
          You can now log in.
        </p>
        <Link to="/login" className="inline-block bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-lg text-sm font-medium transition">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-3xl font-bold mb-8 text-center">Register</h1>
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
            minLength={8}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 rounded-lg font-medium transition"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Login</Link>
      </p>
    </div>
  );
}

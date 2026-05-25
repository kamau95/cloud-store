import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

interface AppUser {
  id: string;
  email: string;
  role: "LOW" | "MID" | "TOP";
  createdAt?: string;
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const isSuper = me?.role === "TOP";
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    api.get<AppUser[]>("/admin/users")
      .then((all) => setUsers(isSuper ? all : all.filter((u) => u.role !== "TOP")))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [isSuper]);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      toast.success("Role updated");
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      await api.post("/admin/users/invite", { email: inviteEmail });
      toast.success("Invitation sent");
      setInviteEmail("");
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const roleBadge = (role: string) => {
    if (role === "LOW") return null;
    const colors: Record<string, string> = {
      TOP: "bg-purple-900 text-purple-400",
      MID: "bg-blue-900 text-blue-400",
    };
    return (
      <span className={`text-xs font-medium px-2 py-1 rounded ${colors[role] || ""}`}>
        {role}
      </span>
    );
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Users</h1>
      <p className="text-gray-500 text-sm mb-8">View all registered users.</p>

      {isSuper && (
        <div className="border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Invite Admin</h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-xl text-sm font-medium transition"
            >
              Invite
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No users found.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id}>
              <button
                onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                className="w-full border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm text-gray-300 truncate">{u.email}</span>
                  {roleBadge(u.role)}
                  {u.id === me?.id && (
                    <span className="text-xs text-gray-600">(you)</span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === u.id ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedId === u.id && (
                <div className="border border-t-0 border-gray-800 rounded-b-xl px-4 py-3 space-y-1 text-sm text-gray-400">
                  <p><span className="text-gray-500">Joined:</span> {formatDate(u.createdAt)}</p>
                  <p><span className="text-gray-500">User ID:</span> <span className="text-xs font-mono">{u.id}</span></p>
                  {isSuper && u.id !== me?.id && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-800 mt-2">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MID">MID</option>
                      </select>
                      {u.role === "MID" && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Demote ${u.email} to regular user?`)) {
                              api.delete(`/admin/users/${u.id}`)
                                .then(() => { toast.success("User demoted"); fetchUsers(); })
                                .catch((err) => toast.error((err as Error).message));
                            }
                          }}
                          className="text-red-500 hover:text-red-400 text-sm px-2 py-1.5 rounded-lg hover:bg-red-900/20 transition"
                          title="Demote to regular user"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

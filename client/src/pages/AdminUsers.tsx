import { useState, useEffect } from "react";
import { api } from "../api/client";
import { User } from "../types";
import toast from "react-hot-toast";

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    api.get<User[]>("/admin/users")
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      toast.success("Role updated");
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: "bg-purple-900 text-purple-400",
      ADMIN: "bg-blue-900 text-blue-400",
      USER: "bg-gray-800 text-gray-400",
    };
    return `text-xs font-medium px-2 py-1 rounded ${colors[role] || colors.LOW}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Users</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No users found.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm text-gray-300 truncate">{u.email}</span>
                <span className={roleBadge(u.role)}>{u.role}</span>
                <span className="text-xs text-gray-600">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</span>
              </div>
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="LOW">LOW</option>
                <option value="MID">MID</option>
                <option value="TOP">TOP</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, FormEvent } from "react";
import { api } from "../api/client";
import toast from "react-hot-toast";

interface AccountEntry {
  path: string;
  provider: string;
  email: string;
  claimed: boolean;
  claimedAt: string | null;
}

interface AccountForm {
  provider: string;
  email: string;
  password: string;
  accessKey: string;
  secretKey: string;
  region: string;
}

const emptyForm: AccountForm = {
  provider: "AWS",
  email: "",
  password: "",
  accessKey: "",
  secretKey: "",
  region: "",
};

type UploadMode = "single" | "bulk";

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<UploadMode>("single");
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [search, setSearch] = useState("");

  const fetchAccounts = () => {
    setLoading(true);
    api.get<AccountEntry[]>("/admin/accounts")
      .then(setAccounts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleSingleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Email and password are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        accounts: [{
          provider: form.provider,
          email: form.email,
          password: form.password,
          ...(form.accessKey && { accessKey: form.accessKey }),
          ...(form.secretKey && { secretKey: form.secretKey }),
          ...(form.region && { region: form.region }),
          specs: {},
        }],
      };
      const data = await api.post("/admin/accounts/upload", payload);
      toast.success(`Uploaded ${(data as { uploaded: number }).uploaded} account`);
      setForm(emptyForm);
      fetchAccounts();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let accounts: Record<string, string>[];
    try {
      accounts = JSON.parse(bulkJson);
      if (!Array.isArray(accounts) || accounts.length === 0) {
        toast.error("Must be a non-empty JSON array");
        return;
      }
    } catch {
      toast.error("Invalid JSON format");
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post("/admin/accounts/upload", { accounts });
      toast.success(`Uploaded ${(data as { uploaded: number }).uploaded} accounts`);
      setBulkJson("");
      fetchAccounts();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = search
    ? accounts.filter((a) =>
        a.email.toLowerCase().includes(search.toLowerCase()) ||
        a.provider.toLowerCase().includes(search.toLowerCase())
      )
    : accounts;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Account Inventory</h1>

      <div className="border border-gray-800 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-lg font-semibold">Add Accounts</h2>
          <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setMode("single")}
              className={`px-3 py-1.5 text-xs rounded-md transition ${
                mode === "single" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setMode("bulk")}
              className={`px-3 py-1.5 text-xs rounded-md transition ${
                mode === "bulk" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Bulk
            </button>
          </div>
        </div>

        {mode === "single" ? (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Provider</label>
                <select
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="AWS">AWS</option>
                  <option value="GCP">GCP</option>
                  <option value="AZURE">Azure</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Password</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Access Key</label>
                <input
                  value={form.accessKey}
                  onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Secret Key</label>
                <input
                  value={form.secretKey}
                  onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Region</label>
                <input
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2 rounded-lg text-sm font-medium transition"
            >
              {submitting ? "Uploading..." : "Add Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="text-xs text-gray-500 mb-2">
              Paste a JSON array of accounts:
            </div>
            <textarea
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono mb-2"
              rows={8}
              placeholder={`[
  {
    "provider": "AWS",
    "email": "aws-dev-3@example.com",
    "password": "pass123",
    "accessKey": "AKIA...",
    "secretKey": "wJalr...",
    "region": "us-east-1"
  }
]`}
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2 rounded-lg text-sm font-medium transition"
            >
              {submitting ? "Uploading..." : "Upload All"}
            </button>
          </form>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Stored ({accounts.length})</h2>
        <input
          type="text"
          placeholder="Search by email or provider..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm w-64"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          {search ? "No matching accounts." : "No accounts in vault. Add one above."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((acc) => (
            <div key={acc.path} className="border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between text-sm hover:border-gray-700 transition">
              <div className="flex items-center gap-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  acc.provider === "AWS" ? "bg-orange-900 text-orange-300" :
                  acc.provider === "GCP" ? "bg-blue-900 text-blue-300" :
                  acc.provider === "AZURE" ? "bg-indigo-900 text-indigo-300" :
                  "bg-gray-700 text-gray-300"
                }`}>
                  {acc.provider}
                </span>
                <span className="text-gray-300">{acc.email}</span>
              </div>
              <span className={`text-xs font-medium ${acc.claimed ? "text-amber-400" : "text-green-400"}`}>
                {acc.claimed ? `Claimed ${acc.claimedAt ? new Date(acc.claimedAt).toLocaleDateString() : ""}` : "Available"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

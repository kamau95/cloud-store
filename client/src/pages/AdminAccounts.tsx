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

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvText, setCsvText] = useState("");

  const fetchAccounts = () => {
    setLoading(true);
    api.get<AccountEntry[]>("/admin/accounts")
      .then(setAccounts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const lines = csvText.trim().split("\n");
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const accounts = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = values[i] || ""; });
        return obj;
      });

      const data = await api.post("/admin/accounts/upload", { accounts });
      toast.success(`Uploaded ${(data as { uploaded: number }).uploaded} accounts`);
      setCsvText("");
      fetchAccounts();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Account Inventory</h1>

      <div className="border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Upload Accounts (CSV)</h2>
        <form onSubmit={handleUpload}>
          <div className="text-xs text-gray-500 mb-3 font-mono">
            Header: provider,email,password,accessKey,secretKey,region,specs
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono mb-4"
            rows={6}
            placeholder={`provider,email,password,accessKey,secretKey,region\nAWS,aws@example.com,pass123,AKIA...,wJalr...,us-east-1`}
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg text-sm font-medium transition">
            Upload to Vault
          </button>
        </form>
      </div>

      <h2 className="text-xl font-semibold mb-4">Stored Accounts ({accounts.length})</h2>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-gray-500">No accounts in vault. Upload some above.</p>
      ) : (
        <div className="space-y-2">
          {accounts.map((acc) => (
            <div key={acc.path} className="border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-400 font-mono">{acc.path}</span>
                <span className="ml-3">{acc.provider}</span>
                <span className="ml-3 text-gray-500">{acc.email}</span>
              </div>
              <span className={acc.claimed ? "text-amber-400" : "text-green-400"}>
                {acc.claimed ? `Claimed ${acc.claimedAt ? new Date(acc.claimedAt).toLocaleDateString() : ""}` : "Available"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

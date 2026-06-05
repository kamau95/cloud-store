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

interface ApiKeyEntry {
  id: string;
  productId: string;
  keyValue: string;
  claimed: boolean;
  claimedAt: string | null;
}

interface ProductInfo {
  id: string;
  name: string;
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
  const [accountMode, setAccountMode] = useState<UploadMode>("single");
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [search, setSearch] = useState("");
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([]);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [apiKeyTab, setApiKeyTab] = useState<"accounts" | "keys">("accounts");
  const [keyMode, setKeyMode] = useState<UploadMode>("single");
  const [keyProductId, setKeyProductId] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [keyBulkJson, setKeyBulkJson] = useState("");
  const [keySubmitting, setKeySubmitting] = useState(false);

  const handleDeleteCred = async (path: string) => {
    if (!confirm("Delete this credential from the vault?")) return;
    try {
      await api.delete(`/admin/accounts/${path}`);
      toast.success("Credential deleted");
      fetchAccounts();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

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

  const fetchApiKeys = async () => {
    try {
      const [keysData, productsData] = await Promise.all([
        api.get<ApiKeyEntry[]>("/admin/api-keys"),
        api.get<ProductInfo[]>("/admin/products"),
      ]);
      setApiKeys(keysData);
      setProducts(productsData);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (apiKeyTab === "keys") fetchApiKeys();
  }, [apiKeyTab]);

  const handleKeySingleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!keyProductId || !keyValue) { toast.error("Product ID and key value required"); return; }
    setKeySubmitting(true);
    try {
      const data = await api.post("/admin/api-keys/upload", { keys: [{ productId: keyProductId, keyValue }] });
      toast.success(`Uploaded ${(data as { uploaded: number }).uploaded} key`);
      setKeyProductId("");
      setKeyValue("");
      fetchApiKeys();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setKeySubmitting(false); }
  };

  const handleKeyBulkSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let keys: Record<string, string>[];
    try {
      keys = JSON.parse(keyBulkJson);
      if (!Array.isArray(keys) || keys.length === 0) { toast.error("Must be a non-empty JSON array"); return; }
    } catch { toast.error("Invalid JSON format"); return; }
    setKeySubmitting(true);
    try {
      const data = await api.post("/admin/api-keys/upload", { keys });
      toast.success(`Uploaded ${(data as { uploaded: number }).uploaded} keys`);
      setKeyBulkJson("");
      fetchApiKeys();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setKeySubmitting(false); }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm("Delete this API key?")) return;
    try {
      await api.delete(`/admin/api-keys/${id}`);
      toast.success("API key deleted");
      fetchApiKeys();
    } catch (err) {
      toast.error((err as Error).message);
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
      <h1 className="text-3xl font-bold mb-8">Inventory</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setApiKeyTab("accounts")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            apiKeyTab === "accounts" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Cloud Accounts
        </button>
        <button
          onClick={() => setApiKeyTab("keys")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            apiKeyTab === "keys" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          API Keys
        </button>
      </div>

      {apiKeyTab === "accounts" ? (
        <>
          <div className="border border-gray-800 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-lg font-semibold">Add Accounts</h2>
              <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setAccountMode("single")}
                  className={`px-3 py-1.5 text-xs rounded-md transition ${
                    accountMode === "single" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() => setAccountMode("bulk")}
                  className={`px-3 py-1.5 text-xs rounded-md transition ${
                    accountMode === "bulk" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Bulk
                </button>
              </div>
            </div>

            {accountMode === "single" ? (
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
                <div className="text-xs text-gray-500 mb-2">Paste a JSON array of accounts:</div>
                <textarea
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono mb-2"
                  rows={8}
                  placeholder={`[{"provider":"AWS","email":"a@b.com","password":"pass","region":"us-east-1"}]`}
                />
                <button
                  type="submit" disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2 rounded-lg text-sm font-medium transition"
                >
                  {submitting ? "Uploading..." : "Upload All"}
                </button>
              </form>
            )}
          </div>

          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">Stored ({accounts.length})</h2>
            <input
              type="text" placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm w-full md:w-64"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-12">{search ? "No matching accounts." : "No accounts in vault."}</p>
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
                    }`}>{acc.provider}</span>
                    <span className="text-gray-300">{acc.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${acc.claimed ? "text-amber-400" : "text-green-400"}`}>
                      {acc.claimed ? `Claimed ${acc.claimedAt ? new Date(acc.claimedAt).toLocaleDateString() : ""}` : "Available"}
                    </span>
                    {!acc.claimed && (
                      <button onClick={() => handleDeleteCred(acc.path)} className="text-red-400 hover:text-red-300 text-xs transition">Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="border border-purple-900/50 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-lg font-semibold">Add API Keys</h2>
              <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setKeyMode("single")}
                  className={`px-3 py-1.5 text-xs rounded-md transition ${
                    keyMode === "single" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() => setKeyMode("bulk")}
                  className={`px-3 py-1.5 text-xs rounded-md transition ${
                    keyMode === "bulk" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Bulk
                </button>
              </div>
            </div>

            {keyMode === "single" ? (
              <form onSubmit={handleKeySingleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Product ID</label>
                    <input value={keyProductId} onChange={(e) => setKeyProductId(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Key Value</label>
                    <input value={keyValue} onChange={(e) => setKeyValue(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono" required />
                  </div>
                </div>
                <button type="submit" disabled={keySubmitting}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-6 py-2 rounded-lg text-sm font-medium transition"
                >
                  {keySubmitting ? "Uploading..." : "Add Key"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleKeyBulkSubmit} className="space-y-4">
                <div className="text-xs text-gray-500 mb-2">Paste a JSON array of API keys:</div>
                <textarea value={keyBulkJson} onChange={(e) => setKeyBulkJson(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono mb-2"
                  rows={8}
                  placeholder={`[{"productId":"ID_HERE","keyValue":"sk-..."}]`}
                />
                <button type="submit" disabled={keySubmitting}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-6 py-2 rounded-lg text-sm font-medium transition"
                >
                  {keySubmitting ? "Uploading..." : "Upload All"}
                </button>
              </form>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Stored Keys ({apiKeys.length})</h2>
          </div>
          {apiKeys.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No API keys stored.</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((k) => {
                const productName = products.find((p) => p.id === k.productId)?.name;
                return (
                  <div key={k.id} className="border border-purple-900/30 rounded-lg px-4 py-3 flex items-center justify-between text-sm hover:border-purple-700/50 transition">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-purple-400 text-xs font-medium">🔑 Key</span>
                          {productName && (
                            <span className="text-gray-500 text-xs truncate">{productName}</span>
                          )}
                        </div>
                        <span className="text-gray-300 font-mono text-xs truncate block">{k.keyValue}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className={`text-xs font-medium ${k.claimed ? "text-amber-400" : "text-green-400"}`}>
                        {k.claimed ? "Claimed" : "Available"}
                      </span>
                      {!k.claimed && (
                        <button onClick={() => handleDeleteApiKey(k.id)} className="text-red-400 hover:text-red-300 text-xs transition">Delete</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

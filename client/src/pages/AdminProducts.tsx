import { useState, useEffect, FormEvent } from "react";
import { api } from "../api/client";
import { Product } from "../types";
import toast from "react-hot-toast";

interface ProductForm {
  name: string; provider: string; description: string;
  priceUsd: string; region: string;
}

const emptyForm: ProductForm = {
  name: "", provider: "AWS", description: "",
  priceUsd: "", region: "",
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [filterProvider, setFilterProvider] = useState("ALL");

  const fetchProducts = () => {
    setLoading(true);
    api.get<Product[]>("/admin/products")
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (p: Product) => {
    setForm({
      name: p.name,
      provider: p.provider,
      description: p.description,
      priceUsd: String(p.priceUsd),
      region: p.region || "",
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...form,
        priceUsd: parseFloat(form.priceUsd),
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, body);
        toast.success("Product updated");
      } else {
        await api.post("/products", body);
        toast.success("Product created");
      }

      resetForm();
      fetchProducts();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDeactivate = async (p: Product) => {
    if (!confirm(`Deactivate "${p.name}"?\n\nVault has ${p.stock} credential(s) for provider ${p.provider}. The product will be hidden from the storefront.`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      toast.success("Deactivated");
      fetchProducts();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const filtered = products.filter((p) => {
    if (filterProvider !== "ALL" && p.provider !== filterProvider) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <button
          onClick={() => showForm ? resetForm() : setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          {showForm ? "Cancel" : "Add Product"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-gray-800 rounded-xl p-6 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editingId ? "Edit Product" : "New Product"}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-gray-400 hover:text-white transition">
                New instead
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Provider</label>
              <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="AWS">AWS</option>
                <option value="GCP">GCP</option>
                <option value="AZURE">Azure</option>
                <option value="OTHER">Other</option>
                <option value="API_KEY">API Key</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" rows={3} required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Price (USD)</label>
              <input type="number" step="0.01" value={form.priceUsd} onChange={(e) => setForm({ ...form, priceUsd: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Region</label>
              <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg text-sm font-medium transition">
            {editingId ? "Update Product" : "Create Product"}
          </button>
        </form>
      )}

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full md:w-64"
        />
        <div className="flex gap-2 flex-wrap">
          {["ALL", "AWS", "GCP", "AZURE", "OTHER", "API_KEY"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterProvider(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterProvider === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} products</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No products found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className={`border rounded-xl p-4 md:flex md:items-center md:justify-between ${
              p.provider === "API_KEY" ? "border-purple-900/50" : "border-gray-800"
            }`}>
              <div className="flex-1 min-w-0">
                <span className="font-medium">{p.name}</span>
                <span className={`text-xs font-medium ml-2 px-2 py-0.5 rounded ${
                  p.provider === "AWS" ? "bg-orange-900/50 text-orange-300" :
                  p.provider === "GCP" ? "bg-blue-900/50 text-blue-300" :
                  p.provider === "AZURE" ? "bg-indigo-900/50 text-indigo-300" :
                  p.provider === "API_KEY" ? "bg-purple-900/50 text-purple-300" :
                  "bg-gray-700 text-gray-300"
                }`}>
                  {p.provider === "API_KEY" ? "API Key" : p.provider}
                </span>
                <span className="text-sm text-gray-600 ml-2">${p.priceUsd}</span>
                <span className={`text-xs ml-2 ${p.stock > 0 ? "text-green-400" : "text-red-400"}`}>
                  {p.stock > 0
                    ? p.provider === "API_KEY" ? `${p.stock} keys in vault` : `${p.stock} in vault`
                    : p.provider === "API_KEY" ? "No keys" : "No credentials"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 md:mt-0 md:ml-4">
                <button onClick={() => startEdit(p)} className="text-blue-400 hover:text-blue-300 text-sm transition">
                  Edit
                </button>
                {p.active ? (
                  <button onClick={() => handleDeactivate(p)} className="text-red-400 hover:text-red-300 text-sm transition">
                    Deactivate
                  </button>
                ) : (
                  <span className="text-xs text-gray-500">Archived</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

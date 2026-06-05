import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Product } from "../types";

const PROVIDER_LOGOS: Record<string, string> = {
  AWS: "☁️",
  GCP: "🔵",
  AZURE: "🟦",
  OTHER: "🖥️",
  API_KEY: "🔑",
};

const PROVIDER_COLORS: Record<string, string> = {
  AWS: "text-orange-400",
  GCP: "text-blue-400",
  AZURE: "text-sky-400",
  OTHER: "text-gray-400",
  API_KEY: "text-purple-400",
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const providerFilter = filter === "KEYS" ? "API_KEY" : filter;
    const params = filter !== "ALL" ? `?provider=${providerFilter}` : "";
    api.get<Product[]>(`/products${params}`)
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex gap-2">
          {["ALL", "AWS", "GCP", "AZURE", "KEYS"].map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : products.length === 0 ? (
        <p className="text-center text-gray-500 py-20">No products available.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition group"
            >
              <div className="flex items-start justify-between mb-4">
                <span className={`text-2xl ${PROVIDER_COLORS[product.provider]}`}>
                  {PROVIDER_LOGOS[product.provider]} {product.provider}
                </span>
                <span className="text-xs bg-gray-800 px-2 py-1 rounded">{product.region || "Global"}</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition">
                {product.name}
              </h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">${product.priceUsd}</span>
                <span className={`text-xs ${product.stock > 0 ? "text-green-400" : "text-red-400"}`}>
                  {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

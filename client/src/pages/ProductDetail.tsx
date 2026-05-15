import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Product, CheckoutResponse } from "../types";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    api.get<Product>(`/products/${id}`)
      .then(setProduct)
      .catch(() => {
        toast.error("Product not found");
        navigate("/products");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleBuy = async () => {
    if (!user) {
      toast.error("Login to purchase");
      navigate("/login");
      return;
    }
    setBuying(true);
    try {
      const data = await api.post<CheckoutResponse>("/orders/checkout", { productId: id });
      window.open(data.paymentUrl, "_blank");
      toast.success("Payment page opened");
      navigate("/orders");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-white mb-6 transition">
        ← Back
      </button>
      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <div className="text-sm text-gray-500 mb-2">{product.provider}</div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-gray-400 mb-6">{product.description}</p>
          {product.specs && (
            <div className="border border-gray-800 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Specifications</h3>
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1.5 text-sm">
                  <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-gray-300">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {product.region && (
            <p className="text-sm text-gray-500">Region: <span className="text-gray-300">{product.region}</span></p>
          )}
        </div>
        <div>
          <div className="border border-gray-800 rounded-xl p-6 sticky top-24">
            <div className="text-3xl font-bold mb-2">${product.priceUsd}</div>
            <div className="text-sm text-gray-400 mb-6">One-time payment</div>
            <div className={`text-sm mb-6 ${product.stock > 0 ? "text-green-400" : "text-red-400"}`}>
              {product.stock > 0 ? `✓ ${product.stock} accounts available` : "✗ Out of stock"}
            </div>
            <button
              onClick={handleBuy}
              disabled={buying || product.stock < 1}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-medium transition mb-4"
            >
              {buying ? "Processing..." : "Buy Now"}
            </button>
            <div className="text-xs text-gray-500 text-center">
              Pay with USDT, USDC, ETH, or BTC via Paymento
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

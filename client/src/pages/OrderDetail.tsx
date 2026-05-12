import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Order } from "../types";
import toast from "react-hot-toast";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [credentials, setCredentials] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingCreds, setFetchingCreds] = useState(false);

  useEffect(() => {
    api.get<Order[]>("/orders/my")
      .then((orders) => {
        const found = orders.find((o) => o.id === id);
        if (!found) {
          toast.error("Order not found");
          navigate("/orders");
          return;
        }
        setOrder(found);
      })
      .catch(() => {
        toast.error("Failed to load order");
        navigate("/orders");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const fetchCredentials = async () => {
    setFetchingCreds(true);
    try {
      const data = await api.get<Record<string, unknown>>(`/orders/${id}/credentials`);
      setCredentials(data);
      toast.success("Credentials loaded — save them now!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setFetchingCreds(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-white mb-6 transition">
        ← Back
      </button>

      <div className="border border-gray-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
          <span className={`text-sm font-medium px-3 py-1 rounded-full border ${
            order.status === "DELIVERED" ? "text-green-400 border-green-800" :
            order.status === "PENDING" ? "text-yellow-400 border-yellow-800" :
            order.status === "PAID" ? "text-blue-400 border-blue-800" :
            "text-red-400 border-red-800"
          }`}>
            {order.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="text-gray-500">Product</span>
            <p className="font-medium">{order.product.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Provider</span>
            <p className="font-medium">{order.product.provider}</p>
          </div>
          <div>
            <span className="text-gray-500">Amount</span>
            <p className="font-medium">${order.amountUsd}</p>
          </div>
          <div>
            <span className="text-gray-500">Payment</span>
            <p className="font-medium">{order.paymentProvider || "—"}</p>
          </div>
          <div>
            <span className="text-gray-500">Created</span>
            <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500">Delivered</span>
            <p className="font-medium">{order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : "—"}</p>
          </div>
        </div>
      </div>

      {order.status === "DELIVERED" && !credentials && (
        <div className="border border-green-800 rounded-xl p-6 text-center">
          <p className="text-green-400 mb-4">Your order has been delivered!</p>
          <button
            onClick={fetchCredentials}
            disabled={fetchingCreds}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 px-6 py-2.5 rounded-lg font-medium transition"
          >
            {fetchingCreds ? "Loading..." : "View Credentials"}
          </button>
        </div>
      )}

      {credentials && (
        <div className="border border-amber-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-amber-400 text-lg">⚠️</span>
            <p className="text-amber-400 text-sm font-medium">
              Save these credentials now. They won't be shown again.
            </p>
          </div>
          <div className="space-y-3 bg-gray-900 rounded-lg p-4 font-mono text-sm">
            {Object.entries(credentials).filter(([k]) => k !== "warning").map(([key, value]) => (
              <div key={key} className="flex">
                <span className="text-gray-500 min-w-[120px] capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                <span className="text-gray-200 break-all">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.status === "PENDING" && (
        <div className="text-center text-gray-500 py-8">
          Waiting for payment confirmation. You can check back shortly.
        </div>
      )}
    </div>
  );
}

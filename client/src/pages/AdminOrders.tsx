import { useState, useEffect } from "react";
import { api } from "../api/client";
import { Order } from "../types";
import toast from "react-hot-toast";

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    setLoading(true);
    api.get<Order[]>("/admin/orders")
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleDeliver = async (id: string) => {
    try {
      await api.patch(`/admin/orders/${id}/deliver`);
      toast.success("Order delivered");
      fetchOrders();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Orders</h1>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No orders yet</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm text-gray-500">#{order.id.slice(0, 8)}</span>
                  <span className="text-sm text-gray-500 ml-3">{order.user?.email || order.userId.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    order.status === "DELIVERED" ? "bg-green-900 text-green-400" :
                    order.status === "PENDING" ? "bg-yellow-900 text-yellow-400" :
                    order.status === "PAID" ? "bg-blue-900 text-blue-400" :
                    "bg-red-900 text-red-400"
                  }`}>
                    {order.status}
                  </span>
                  {order.status === "PENDING" && (
                    <button
                      onClick={() => handleDeliver(order.id)}
                      className="text-xs bg-green-600 hover:bg-green-500 px-3 py-1 rounded transition"
                    >
                      Deliver
                    </button>
                  )}
                </div>
              </div>
              <div className="text-sm">
                <span className="font-medium">{order.product?.name || "—"}</span>
                <span className="text-gray-500 ml-2">${order.amountUsd}</span>
                {order.paymentProvider && <span className="text-gray-600 ml-2">• {order.paymentProvider}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { api } from "../api/client";
import { Order } from "../types";
import toast from "react-hot-toast";

type Tab = "ALL" | "PENDING" | "PAID" | "DELIVERED" | "CANCELLED";

const TAB_LABELS: Record<Tab, string> = {
  ALL: "All",
  PENDING: "Pending",
  PAID: "Paid",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const TAB_COLORS: Record<Tab, string> = {
  ALL: "text-gray-300 border-gray-600",
  PENDING: "text-yellow-400 border-yellow-700",
  PAID: "text-blue-400 border-blue-700",
  DELIVERED: "text-green-400 border-green-700",
  CANCELLED: "text-red-400 border-red-700",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("PENDING");

  const fetchOrders = () => {
    setLoading(true);
    api.get<Order[]>("/admin/orders")
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this order?")) return;
    try {
      await api.patch(`/admin/orders/${id}/cancel`);
      toast.success("Order cancelled");
      fetchOrders();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDeliver = async (id: string) => {
    try {
      await api.patch(`/admin/orders/${id}/deliver`);
      toast.success("Order delivered");
      fetchOrders();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const counts: Record<Tab, number> = {
    ALL: orders.length,
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    PAID: orders.filter((o) => o.status === "PAID").length,
    DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
  };

  const filtered = tab === "ALL" ? orders : orders.filter((o) => o.status === tab);
  const tabs: Tab[] = ["PENDING", "PAID", "DELIVERED", "CANCELLED", "ALL"];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Orders</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t
                ? TAB_COLORS[t]
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            {TAB_LABELS[t]}
            <span className="ml-1.5 text-xs opacity-70">({counts[t]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No {tab === "ALL" ? "" : TAB_LABELS[tab].toLowerCase()} orders.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
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
                    <>
                      <button
                        onClick={() => handleDeliver(order.id)}
                        className="text-xs bg-green-600 hover:bg-green-500 px-3 py-1 rounded transition"
                      >
                        Deliver
                      </button>
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="text-xs bg-red-600 hover:bg-red-500 px-3 py-1 rounded transition"
                      >
                        Cancel
                      </button>
                    </>
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

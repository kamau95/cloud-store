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
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    api.get<Order[]>(`/admin/orders${qs ? `?${qs}` : ""}`)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [search, dateFrom, dateTo]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this cancelled order permanently?")) return;
    try {
      await api.delete(`/admin/orders/${id}`);
      toast.success("Order deleted");
      fetchOrders();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

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

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by order ID or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-72"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <span className="text-gray-500 text-sm">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        {(search || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-gray-400 hover:text-white transition"
          >
            Clear filters
          </button>
        )}
      </div>

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
            <div key={order.id} className="border border-gray-800 rounded-xl">
              <div
                className="md:hidden flex items-center justify-between p-4 cursor-pointer select-none"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-gray-500 shrink-0">#{order.id.slice(0, 8)}</span>
                  <span className="text-sm text-gray-500 truncate">{order.user?.email || order.userId.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    order.status === "DELIVERED" ? "bg-green-900 text-green-400" :
                    order.status === "PENDING" ? "bg-yellow-900 text-yellow-400" :
                    order.status === "PAID" ? "bg-blue-900 text-blue-400" :
                    "bg-red-900 text-red-400"
                  }`}>
                    {order.status}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === order.id ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="hidden md:block p-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm text-gray-500">#{order.id.slice(0, 8)}</span>
                    <span className="text-sm text-gray-500 ml-3">{order.user?.email || order.userId.slice(0, 8)}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    order.status === "DELIVERED" ? "bg-green-900 text-green-400" :
                    order.status === "PENDING" ? "bg-yellow-900 text-yellow-400" :
                    order.status === "PAID" ? "bg-blue-900 text-blue-400" :
                    "bg-red-900 text-red-400"
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{order.product?.name || "—"}</span>
                    <span className="text-gray-500 ml-2">${order.amountUsd}</span>
                    {order.paymentProvider && <span className="text-gray-600 ml-2">• {order.paymentProvider}</span>}
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    <div>{new Date(order.createdAt).toLocaleString()}</div>
                    {order.status === "PAID" && order.paidAt && (
                      <div className="text-blue-400">Paid: {new Date(order.paidAt).toLocaleString()}</div>
                    )}
                    {order.status === "DELIVERED" && order.deliveredAt && (
                      <div className="text-green-400">Delivered: {new Date(order.deliveredAt).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`md:block ${expandedId === order.id ? "block" : "hidden"}`}>
                <div className="md:hidden px-4 pb-3">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{order.product?.name || "—"}</span>
                      <span className="text-gray-500 ml-2">${order.amountUsd}</span>
                      {order.paymentProvider && <span className="text-gray-600 ml-2">• {order.paymentProvider}</span>}
                    </div>
                    <div className="text-right text-xs text-gray-600">
                      <div>{new Date(order.createdAt).toLocaleString()}</div>
                      {order.status === "PAID" && order.paidAt && (
                        <div className="text-blue-400">Paid: {new Date(order.paidAt).toLocaleString()}</div>
                      )}
                      {order.status === "DELIVERED" && order.deliveredAt && (
                        <div className="text-green-400">Delivered: {new Date(order.deliveredAt).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                </div>

                {(order.status === "PENDING" || order.status === "CANCELLED") && (
                  <div className="border-t border-gray-800 px-4 py-2.5 flex items-center justify-end gap-2">
                    {order.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleDeliver(order.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Deliver
                        </button>
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          Cancel
                        </button>
                      </>
                    )}
                    {order.status === "CANCELLED" && (
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

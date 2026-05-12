import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Order } from "../types";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-yellow-400",
  PAID: "text-blue-400",
  DELIVERED: "text-green-400",
  CANCELLED: "text-red-400",
};

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Order[]>("/orders/my")
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">No orders yet</p>
          <Link to="/products" className="text-blue-400 hover:underline">Browse products</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Order #{order.id.slice(0, 8)}</span>
                <span className={`text-sm font-medium ${STATUS_COLORS[order.status]}`}>
                  {order.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{order.product.name}</span>
                  <span className="text-sm text-gray-500 ml-2">{order.product.provider}</span>
                </div>
                <span className="text-lg font-bold">${order.amountUsd}</span>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                {new Date(order.createdAt).toLocaleString()}
                {order.paymentProvider && ` • ${order.paymentProvider}`}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

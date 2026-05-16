import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface FeeSummary {
  totalOrders: number;
  totalProductRevenue: number;
  totalAdminFees: number;
  totalGatewayFees: number;
  totalSellerPayouts: number;
  totalCollected: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [fees, setFees] = useState<FeeSummary | null>(null);
  const isSuper = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (isSuper) {
      api
        .get<FeeSummary>("/admin/fees")
        .then(setFees)
        .catch(() => {});
    }
  }, [isSuper]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        {isSuper && (
          <span className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full font-medium">
            Super Admin
          </span>
        )}
      </div>

      {isSuper && fees && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold">{fees.totalOrders}</div>
            <div className="text-xs text-gray-500">Orders delivered</div>
          </div>
          <div className="border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">
              ${fees.totalProductRevenue.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">Product revenue</div>
          </div>
          <div className="border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-400">
              ${fees.totalAdminFees.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">Admin fees</div>
          </div>
          <div className="border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">
              ${fees.totalSellerPayouts.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">Seller payouts</div>
          </div>
          <div className="border border-gray-800 rounded-xl p-4">
            <div className="text-lg font-bold text-gray-300">
              ${fees.totalGatewayFees.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">Gateway fees</div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <Link
          to="/admin/products"
          className="border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
        >
          <h2 className="text-lg font-semibold mb-2">Products</h2>
          <p className="text-sm text-gray-400">
            Manage product listings, pricing, and stock
          </p>
        </Link>
        <Link
          to="/admin/orders"
          className="border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
        >
          <h2 className="text-lg font-semibold mb-2">Orders</h2>
          <p className="text-sm text-gray-400">
            View and manage orders, manually deliver
          </p>
        </Link>
        <Link
          to="/admin/accounts"
          className="border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
        >
          <h2 className="text-lg font-semibold mb-2">Accounts</h2>
          <p className="text-sm text-gray-400">
            Upload and manage cloud account inventory
          </p>
        </Link>
      </div>
    </div>
  );
}

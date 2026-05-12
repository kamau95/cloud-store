import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <Link
          to="/admin/products"
          className="border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
        >
          <h2 className="text-lg font-semibold mb-2">Products</h2>
          <p className="text-sm text-gray-400">Manage product listings, pricing, and stock</p>
        </Link>
        <Link
          to="/admin/orders"
          className="border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
        >
          <h2 className="text-lg font-semibold mb-2">Orders</h2>
          <p className="text-sm text-gray-400">View and manage orders, manually deliver</p>
        </Link>
        <Link
          to="/admin/accounts"
          className="border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
        >
          <h2 className="text-lg font-semibold mb-2">Accounts</h2>
          <p className="text-sm text-gray-400">Upload and manage cloud account inventory</p>
        </Link>
      </div>
    </div>
  );
}

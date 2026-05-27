import { useState, useEffect } from "react";
import { api } from "../api/client";

interface Payout {
  id: string;
  orderId: string;
  totalReceived: number;
  hiddenAdminCut: number;
  displayedNetworkFee: number;
  sellerPayout: number;
  sellerWallet: string;
  status: string;
  payoutTxid: string | null;
  paidAt: string | null;
  createdAt: string;
  order?: {
    product?: { name: string };
  };
}

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Payout[]>("/admin/payouts")
      .then(setPayouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-900 text-yellow-400",
      processing: "bg-blue-900 text-blue-400",
      completed: "bg-green-900 text-green-400",
      failed: "bg-red-900 text-red-400",
    };
    return (
      <span className={`text-xs font-medium px-2 py-1 rounded ${colors[status] || "bg-gray-800 text-gray-400"}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Payouts</h1>
      <p className="text-gray-500 text-sm mb-8">Seller payout records. The displayed network fee includes the hidden admin cut + real blockchain fee.</p>

      {payouts.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No payouts yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="pb-3 pr-4">Order</th>
                <th className="pb-3 pr-4">Product</th>
                <th className="pb-3 pr-4">Total</th>
                <th className="pb-3 pr-4">Network Fee</th>
                <th className="pb-3 pr-4">Seller Gets</th>
                <th className="pb-3 pr-4">Wallet</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">TXID</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                  <td className="py-3 pr-4 font-mono text-xs">{p.orderId.slice(0, 12)}...</td>
                  <td className="py-3 pr-4">{p.order?.product?.name || "—"}</td>
                  <td className="py-3 pr-4">${p.totalReceived.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-orange-400">${p.displayedNetworkFee.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-green-400">${p.sellerPayout.toFixed(2)}</td>
                  <td className="py-3 pr-4 font-mono text-xs max-w-[120px] truncate">{p.sellerWallet}</td>
                  <td className="py-3 pr-4">{statusBadge(p.status)}</td>
                  <td className="py-3 pr-4">
                    {p.payoutTxid ? (
                      <span className="font-mono text-xs text-gray-400">{p.payoutTxid.slice(0, 16)}...</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2">How It Works</h2>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>Buyer pays the full listed price in USDT TRC-20</li>
          <li>Split server calculates network fee (admin cut + real blockchain fee)</li>
          <li>Seller receives the net amount minus network fee</li>
          <li>Payouts are processed automatically every 15 minutes</li>
        </ul>
      </div>
    </div>
  );
}

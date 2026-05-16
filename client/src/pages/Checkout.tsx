import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { CheckoutResponse, OrderPaymentStatus } from "../types";
import toast from "react-hot-toast";

export default function Checkout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [expiresIn, setExpiresIn] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [ack3, setAck3] = useState(false);
  const [ack4, setAck4] = useState(false);
  const [ack5, setAck5] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<OrderPaymentStatus | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!id) return;
    api
      .get<CheckoutResponse>(`/orders/checkout/${id}`)
      .then(setCheckout)
      .catch(() => {
        toast.error("Checkout session not found");
        navigate("/products");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!checkout) return;
    const expiry = new Date(checkout.expiresAt).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = expiry - now;
      if (diff <= 0) {
        setExpired(true);
        setExpiresIn("Expired");
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setExpiresIn(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [checkout]);

  const startPolling = useCallback(() => {
    if (!id) return;
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.get<OrderPaymentStatus>(
          `/orders/${id}/status`
        );
        setPaymentStatus(status);
        if (status.delivered) {
          clearInterval(pollRef.current);
          setPolling(false);
        }
      } catch {
      }
    }, 10000);
  }, [id]);

  useEffect(() => {
    if (ack1 && ack2 && ack3 && ack4 && ack5 && !polling) {
      startPolling();
    }
  }, [ack1, ack2, ack3, ack4, ack5, polling, startPolling]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(label);
      setTimeout(() => setCopying(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const allChecked = ack1 && ack2 && ack3 && ack4 && ack5;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!checkout) return null;

  if (paymentStatus?.delivered) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="border border-green-800 bg-green-900/20 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">
            Payment Confirmed!
          </h2>
          <p className="text-gray-400 mb-6">
            Order #{paymentStatus.orderId.slice(0, 8)} has been processed.
          </p>
          <button
            onClick={() => navigate(`/orders/${id}`)}
            className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-medium transition"
          >
            View Credentials
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Pay with Crypto</h2>
          <span className="text-sm text-gray-400">
            Order #{checkout.orderId.slice(0, 8)}
          </span>
        </div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-3xl font-bold">
              ${checkout.amount.toFixed(2)}
            </div>
            {checkout.basePrice && (
              <div className="text-xs text-gray-500 mt-1">
                You pay the listed price. No hidden fees.
              </div>
            )}
          </div>
          <div
            className={`text-sm ${expired ? "text-red-400" : "text-yellow-400"}`}
          >
            {expired ? "Quote expired" : `Quote expires in: ${expiresIn}`}
          </div>
        </div>

      </div>

      {expired ? (
        <div className="border border-red-800 bg-red-900/20 rounded-xl p-6 text-center">
          <p className="text-red-400 mb-4">
            This payment quote has expired. Please start a new order.
          </p>
          <button
            onClick={() => navigate("/products")}
            className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded-lg font-medium transition"
          >
            Back to Products
          </button>
        </div>
      ) : (
        <>
          <div className="border border-gray-800 rounded-xl p-6 mb-6">
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">Send exactly</div>
              <div className="text-2xl font-bold text-green-400">
                {checkout.amount.toFixed(2)} {checkout.currency}
              </div>
              <button
                onClick={() =>
                  copy(checkout.amount.toFixed(2), "amount")
                }
                className="mt-2 w-full border border-gray-700 hover:border-gray-500 rounded-lg py-2 text-sm transition"
              >
                {copying === "amount" ? "Copied!" : "Copy Amount"}
              </button>
            </div>

            <div className="border-t border-gray-800 my-4" />

            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">
                Send to this address
              </div>
              <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm break-all mb-2">
                {checkout.walletAddress}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    copy(checkout.walletAddress, "address")
                  }
                  className="flex-1 border border-gray-700 hover:border-gray-500 rounded-lg py-2 text-sm transition"
                >
                  {copying === "address" ? "Copied!" : "Copy Address"}
                </button>
                <button
                  onClick={() =>
                    window.open(
                      `https://tronscan.org/#/address/${checkout.walletAddress}`,
                      "_blank"
                    )
                  }
                  className="flex-1 border border-gray-700 hover:border-gray-500 rounded-lg py-2 text-sm transition"
                >
                  View on Tronscan
                </button>
              </div>
            </div>

            <div className="border-t border-gray-800 my-4" />

            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
              <div className="text-sm font-semibold text-yellow-400 mb-2">
                Network: {checkout.network} ONLY
              </div>
              <p className="text-xs text-gray-400 mb-2">
                Do NOT use Ethereum (ERC-20), BSC (BEP-20), or any other
                network. Using the wrong network will result in permanent loss
                of funds.
              </p>
            </div>

            <div className="border-t border-gray-800 my-4" />

            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-xs text-gray-400 space-y-1">
              <p>✗ Wrong address = lost forever</p>
              <p>✗ Wrong network = lost forever</p>
              <p>✗ Wrong amount = manual fix needed</p>
              <p>
                ✗ Sending from exchange?{" "}
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-blue-400 hover:underline"
                >
                  See guide below
                </button>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full border border-gray-700 hover:border-gray-500 rounded-xl p-4 mb-6 text-left transition"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Paying from Binance / Coinbase / Kraken / Bybit?
              </span>
              <span className="text-gray-500">{showGuide ? "▲" : "▼"}</span>
            </div>
          </button>

          {showGuide && (
            <div className="border border-gray-700 rounded-xl p-4 mb-6 text-sm space-y-3">
              <p className="font-semibold text-gray-300">
                Step-by-step withdrawal guide:
              </p>
              <div className="space-y-2 text-gray-400">
                <p>
                  <span className="text-gray-300">Step 1:</span> Open your
                  exchange app/website
                </p>
                <p>
                  <span className="text-gray-300">Step 2:</span> Go to Wallet
                  → Withdraw → Crypto
                </p>
                <p>
                  <span className="text-gray-300">Step 3:</span> Search and
                  select: USDT (Tether)
                </p>
                <p>
                  <span className="text-gray-300">Step 4:</span> Paste the
                  address above
                </p>
                <p>
                  <span className="text-gray-300">Step 5:</span> Select
                  Network:{" "}
                  <span className="text-red-400 font-semibold">
                    TRON (TRC-20)
                  </span>
                </p>
                <p>
                  <span className="text-gray-300">Step 6:</span> Enter amount:{" "}
                  {checkout.amount.toFixed(2)} USDT
                </p>
                <p>
                  <span className="text-gray-300">Step 7:</span>{" "}
                  Double-check address, network, and amount
                </p>
                <p>
                  <span className="text-gray-300">Step 8:</span> Confirm and
                  save the transaction ID (TxID)
                </p>
              </div>
            </div>
          )}

          <div className="border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Pre-Payment Checklist
            </h3>
            <div className="space-y-3 text-sm">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ack1}
                  onChange={() => setAck1(!ack1)}
                  className="mt-1"
                />
                <span className="text-gray-400">
                  I understand I must send exactly{" "}
                  {checkout.amount.toFixed(2)} USDT
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ack2}
                  onChange={() => setAck2(!ack2)}
                  className="mt-1"
                />
                <span className="text-gray-400">
                  I understand I must use Tron (TRC-20) network ONLY
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ack3}
                  onChange={() => setAck3(!ack3)}
                  className="mt-1"
                />
                <span className="text-gray-400">
                  I have double-checked the address and network
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ack4}
                  onChange={() => setAck4(!ack4)}
                  className="mt-1"
                />
                <span className="text-gray-400">
                  I understand wrong address/network = lost forever
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ack5}
                  onChange={() => setAck5(!ack5)}
                  className="mt-1"
                />
                <span className="text-gray-400">
                  I understand this payment is non-reversible
                </span>
              </label>
            </div>
          </div>

          {!allChecked && (
            <div className="text-center text-sm text-gray-500 mb-6">
              Check all boxes above to start monitoring for payment
            </div>
          )}

          {allChecked && !paymentStatus && (
            <div className="border border-blue-800 bg-blue-900/20 rounded-xl p-6 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-blue-400 font-medium">
                Waiting for your payment...
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Monitoring the blockchain for incoming USDT to the address
                above. This page updates automatically.
              </p>
            </div>
          )}

          {paymentStatus && !paymentStatus.delivered && (
            <div className="border border-yellow-800 bg-yellow-900/20 rounded-xl p-6 text-center">
              <div className="animate-pulse text-4xl mb-2">⏳</div>
              <p className="text-yellow-400 font-medium">
                Payment detected on blockchain!
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Waiting for confirmations. This usually takes a few minutes.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

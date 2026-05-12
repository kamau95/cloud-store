import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-gray-950 to-purple-900/20" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
              Cloud Accounts{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Instantly
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
              Purchase verified AWS, GCP, and Azure accounts with crypto. 
              Instant delivery after payment confirmation. No KYC required.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/products"
                className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg text-lg font-medium transition"
              >
                Browse Products
              </Link>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> USDT</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> USDC</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> ETH</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> BTC</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Why CloudStore?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "Crypto Payments", desc: "Pay with USDT, USDC, ETH, or BTC via Coinbase Commerce or BTCPay Server." },
            { title: "Instant Delivery", desc: "Credentials delivered automatically on payment confirmation." },
            { title: "No KYC", desc: "Fully anonymous. Email-only registration. Your privacy matters." },
            { title: "Multiple Providers", desc: "AWS, GCP, Azure, and more. One marketplace for all cloud accounts." },
            { title: "Vault Security", desc: "Credentials stored securely in HashiCorp Vault, never in plain text." },
            { title: "24/7 Support", desc: "Get help when you need it. Admin panel for order management." },
          ].map((feature) => (
            <div key={feature.title} className="border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition">
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Accepted Payment Methods</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <span className="text-gray-400 font-mono">Coinbase Commerce</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400 font-mono">BTCPay Server</span>
          </div>
        </div>
      </section>
    </div>
  );
}

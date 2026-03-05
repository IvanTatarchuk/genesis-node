"use client";

import { useState, useEffect } from "react";
import { Loader, TrendingUp, ArrowRightLeft, Clock } from "lucide-react";

interface Wallet { balance: number; total_earned: number; total_spent: number; total_exchanged: number }
interface Transaction { id: string; amount: number; type: string; description: string; created_at: string }
interface ExchangeOrder { order_id: string; usd_amount: number; matadora_amount: number; status: string }

export default function MatadoraClient({ currentRate }: { currentRate: number }) {
  const [wallet, setWallet]       = useState<Wallet | null>(null);
  const [txns, setTxns]           = useState<Transaction[]>([]);
  const [loading, setLoading]     = useState(true);
  const [exchangeAmt, setExchange] = useState("");
  const [exchanging, setExchanging] = useState(false);
  const [order, setOrder]         = useState<ExchangeOrder | null>(null);
  const [error, setError]         = useState("");

  useEffect(() => {
    fetch("/api/matadora")
      .then((r) => r.json())
      .then((d) => {
        if (d.wallet) setWallet(d.wallet);
        if (d.transactions) setTxns(d.transactions);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleExchange() {
    const amount = parseInt(exchangeAmt, 10);
    if (!amount || amount < 1000) { setError("Minimum 1,000 MATADORA"); return; }
    setExchanging(true); setError("");
    try {
      const res = await fetch("/api/matadora/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Exchange failed"); return; }
      setOrder(data);
      setWallet((prev) => prev ? { ...prev, balance: prev.balance - amount } : prev);
    } finally {
      setExchanging(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader className="h-5 w-5 animate-spin text-amber-400" />
    </div>
  );

  if (!wallet) return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
      <p className="text-slate-400 text-sm">Sign in to see your MATADORA wallet</p>
      <a href="/login" className="mt-3 inline-block rounded-full bg-amber-600 hover:bg-amber-500 px-5 py-2 text-sm font-medium text-white transition">
        Sign in
      </a>
    </div>
  );

  const usdValue = (wallet.balance * currentRate).toFixed(2);
  const exchangeInput = parseInt(exchangeAmt, 10) || 0;
  const usdPreview = (exchangeInput * currentRate).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Wallet card */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-amber-400 font-medium">Your MATADORA</span>
          <TrendingUp className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex items-end gap-2 mb-1">
          <span className="text-4xl font-black text-amber-400">{wallet.balance.toLocaleString()}</span>
          <span className="text-slate-500 text-sm mb-1">MATADORA</span>
        </div>
        <div className="text-slate-500 text-sm mb-4">≈ ${usdValue} USD at current rate</div>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-lg bg-slate-800/60 p-2">
            <div className="text-emerald-400 font-semibold">{wallet.total_earned.toLocaleString()}</div>
            <div className="text-slate-600">earned</div>
          </div>
          <div className="rounded-lg bg-slate-800/60 p-2">
            <div className="text-red-400 font-semibold">{wallet.total_spent.toLocaleString()}</div>
            <div className="text-slate-600">spent</div>
          </div>
          <div className="rounded-lg bg-slate-800/60 p-2">
            <div className="text-blue-400 font-semibold">{wallet.total_exchanged.toLocaleString()}</div>
            <div className="text-slate-600">exchanged</div>
          </div>
        </div>
      </div>

      {/* Exchange form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <ArrowRightLeft className="h-4 w-4 text-amber-400" />
          Exchange MATADORA → USD
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-slate-500">MATADORA amount</label>
            <input
              type="number"
              min="1000"
              step="100"
              value={exchangeAmt}
              onChange={(e) => setExchange(e.target.value)}
              placeholder="Min 1,000"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500"
            />
          </div>
          <div className="text-slate-600 mt-5">→</div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-slate-500">You receive (USD)</label>
            <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-emerald-400 font-bold">
              ${exchangeInput >= 1000 ? usdPreview : "—"}
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {order ? (
          <div className="rounded-xl bg-emerald-950/50 border border-emerald-500/20 p-4 text-sm text-emerald-300 space-y-1">
            <p className="font-semibold">Exchange requested ✓</p>
            <p className="text-emerald-400/70">
              {order.matadora_amount.toLocaleString()} MATADORA → ${order.usd_amount} USD
            </p>
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Processing within 1-3 business days
            </p>
          </div>
        ) : (
          <button
            onClick={handleExchange}
            disabled={exchanging || !exchangeAmt || parseInt(exchangeAmt, 10) < 1000}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-bold text-white disabled:opacity-40 transition hover:brightness-110"
          >
            {exchanging ? "Processing…" : "Request Exchange"}
          </button>
        )}
        <p className="text-xs text-slate-600 text-center">
          Rate: 1 MATADORA = ${currentRate.toFixed(4)} · Payout via Stripe
        </p>
      </div>

      {/* Recent transactions */}
      {txns.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
          <p className="text-xs text-slate-500 mb-3">Recent transactions</p>
          {txns.slice(0, 10).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
              <div>
                <p className="text-xs text-slate-300">{t.description}</p>
                <p className="text-xs text-slate-600">{new Date(t.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`text-sm font-bold ${t.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

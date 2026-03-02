"use client";

import { useState } from "react";
import { BoltIcon } from "lucide-react";

const PACKS = [
  { label: "500 credits",   amount: 500,  price: "$5"  },
  { label: "2,000 credits", amount: 2000, price: "$20" },
  { label: "5,000 credits", amount: 5000, price: "$50" },
];

export default function BuyCreditsButton() {
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState<number | null>(null);

  async function purchase(amount: number) {
    setLoading(amount);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: amount }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 shadow-sm transition hover:border-slate-700 hover:bg-slate-800"
      >
        <BoltIcon className="h-4 w-4 text-indigo-400" />
        Buy credits
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl shadow-black/60">
            <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              Credit packs
            </p>
            {PACKS.map((pack) => (
              <button
                key={pack.amount}
                onClick={() => purchase(pack.amount)}
                disabled={loading === pack.amount}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
              >
                <span>{pack.label}</span>
                <span className="text-xs font-medium text-indigo-400">
                  {loading === pack.amount ? "…" : pack.price}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

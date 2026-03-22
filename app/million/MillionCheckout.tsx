"use client";

import { useState } from "react";

export function MillionCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState("");

  async function handleBuy() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/million-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guestEmail ? { email: guestEmail } : {}),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("No checkout URL received.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full sm:w-auto">
      <input
        type="email"
        placeholder="Email (for guests)"
        value={guestEmail}
        onChange={(e) => setGuestEmail(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 sm:hidden"
      />
      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-6 py-3 text-sm font-medium text-white transition"
      >
        {loading ? "Redirecting…" : "Buy now"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}


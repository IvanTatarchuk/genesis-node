"use client";

import { useState } from "react";
import { HeartIcon, XIcon, CheckIcon, ZapIcon } from "lucide-react";

const PRESETS = [25, 50, 100, 250, 500];

export default function DonateModal({
  mode,
  creatorId,
  creatorName,
  balance,
  onClose,
  onSuccess,
}: {
  mode: "creator" | "platform";
  creatorId?: string;
  creatorName?: string;
  balance: number;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const effectiveAmount = custom.trim() ? Math.floor(Number(custom)) : amount;
  const canAfford = balance >= effectiveAmount;
  const valid = effectiveAmount >= 10 && effectiveAmount <= 10_000;

  async function handleDonate() {
    if (!valid || !canAfford) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientType: mode,
          ...(mode === "creator" && creatorId && { recipientId: creatorId }),
          amount: effectiveAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
      onSuccess?.();
    } catch {
      setError("Connection issue. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "creator" ? `Support ${creatorName ?? "creator"}` : "Support Genesis Node";
  const subtitle = mode === "creator"
    ? "Send credits as a thank-you. They go directly to the creator."
    : "Your donation helps us keep the platform running and add new features.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <HeartIcon className="h-5 w-5 text-rose-400" />
            <h2 className="font-bold text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-200 transition" aria-label="Закрити">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Thank you!</h3>
            <p className="text-sm text-slate-400 mb-6">
              {effectiveAmount} credits {mode === "creator" ? `sent to ${creatorName}.` : "donated to Genesis Node."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 transition py-3 text-sm font-semibold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-slate-400 mb-4">{subtitle}</p>
            <p className="text-xs text-slate-500 mb-3">Your balance: <span className="font-medium text-indigo-400">{balance} credits</span></p>

            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setAmount(n); setCustom(""); }}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    !custom && amount === n
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-4">
              <label className="text-xs text-slate-500 shrink-0">Custom:</label>
              <input
                type="number"
                min={10}
                max={10000}
                placeholder="10–10000"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500"
                aria-label="Custom amount in credits"
              />
              <span className="text-xs text-slate-500 shrink-0">credits</span>
            </div>

            {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

            <button
              type="button"
              onClick={handleDonate}
              disabled={loading || !valid || !canAfford}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition py-3 text-sm font-semibold text-white"
            >
              <ZapIcon className="h-4 w-4" />
              {loading ? "Sending…" : `Send ${effectiveAmount} credits`}
            </button>
            {!canAfford && valid && (
              <p className="mt-2 text-xs text-amber-400 text-center">Insufficient balance. Get more credits from Pricing or Dashboard.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

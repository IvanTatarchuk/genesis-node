"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    name: "Starter",
    tier: "starter",
    price: { monthly: 57, annual: 45 },
    credits: 2000,
    description: "For individuals and indie hackers exploring AI automation.",
    features: [
      "2,000 credits / month",
      "All marketplace agents",
      "Real-time task streaming",
      "Email support",
      "Credits roll over",
    ],
    cta: "Get started",
    highlight: false,
    badge: null,
  },
  {
    name: "Pro",
    tier: "pro",
    price: { monthly: 147, annual: 117 },
    credits: 6000,
    description: "For power users and small teams running agents daily.",
    features: [
      "6,000 credits / month",
      "All marketplace agents",
      "Priority task queue",
      "Shareable result cards",
      "API access",
      "Priority support",
      "Credits roll over",
    ],
    cta: "Go Pro",
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Agency",
    tier: "agency",
    price: { monthly: 297, annual: 237 },
    credits: 15000,
    description: "For agencies and teams with high-volume automation needs.",
    features: [
      "15,000 credits / month",
      "Everything in Pro",
      "5 team seats",
      "White-label results",
      "Custom agent deployment",
      "Dedicated Slack channel",
      "SLA 99.9% uptime",
      "Credits roll over",
    ],
    cta: "Contact sales",
    highlight: false,
    badge: null,
  },
];

export default function PricingCards() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function subscribe(tier: string) {
    setError(null);
    setLoading(tier);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, billing }),
      });

      if (res.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }

      const contentType = res.headers.get("content-type");
      const isJson = contentType?.includes("application/json");
      const data = isJson ? await res.json() : { error: `Server error (${res.status})` };

      if (!res.ok) {
        const msg = data.error ?? data.message ?? `Request failed (${res.status})`;
        setError(msg);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setError(data.error ?? "Checkout could not be started. Please try again.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network or server error. Try again.";
      setError(msg);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-200" aria-label="Close">
            ✕
          </button>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBilling("monthly")}
          className={`text-sm transition ${
            billing === "monthly" ? "text-slate-100" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBilling(billing === "monthly" ? "annual" : "monthly")}
          className={`relative inline-flex h-6 w-11 rounded-full border transition ${
            billing === "annual"
              ? "border-indigo-500 bg-indigo-600"
              : "border-slate-700 bg-slate-800"
          }`}
          aria-label={billing === "monthly" ? "Switch to annual billing" : "Switch to monthly billing"}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
              billing === "annual" ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={`text-sm transition ${
            billing === "annual" ? "text-slate-100" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Annual
          <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
            Save 20%
          </span>
        </button>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const price = billing === "annual" ? plan.price.annual : plan.price.monthly;
          return (
            <div
              key={plan.tier}
              className={`relative flex flex-col rounded-2xl border p-6 transition ${
                plan.highlight
                  ? "border-indigo-500/70 bg-indigo-950/40 shadow-xl shadow-indigo-500/10"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 px-3 py-1 text-[11px] font-semibold text-white shadow-lg shadow-indigo-500/30">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6 space-y-2">
                <p className={`text-sm font-semibold ${plan.highlight ? "text-indigo-300" : "text-slate-300"}`}>
                  {plan.name}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">${price}</span>
                  <span className="mb-1 text-sm text-slate-500">/ mo</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {plan.credits.toLocaleString()} credits included
                </p>
                <p className="text-xs text-slate-400">{plan.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => subscribe(plan.tier)}
                disabled={loading === plan.tier}
                className={`w-full rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-60 ${
                  plan.highlight
                    ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/30 hover:brightness-110"
                    : "border border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600 hover:bg-slate-700"
                }`}
              >
                {loading === plan.tier ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Redirecting…
                  </span>
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Free tier note */}
      <p className="text-center text-xs text-slate-500">
        No credit card required to start.{" "}
        <a href="/login" className="text-indigo-400 hover:underline">
          Create a free account
        </a>{" "}
        and get 100 free credits.
      </p>
      <p className="text-center text-xs text-slate-600 mt-1">
        Cancel anytime. Need help choosing? <a href="/support" className="text-indigo-400 hover:underline">We&apos;re here</a>.
      </p>
    </div>
  );
}

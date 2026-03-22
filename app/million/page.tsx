import Link from "next/link";
import { MillionCheckout } from "./MillionCheckout";

export const metadata = {
  title: "Path to $1M — Enterprise | Genesis Node",
  description:
    "Strategy, playbook, and 1:1 advisory to get your company to $1M ARR. One-time high-ticket offer.",
};

const DISPLAY_PRICE = process.env.MILLION_PRODUCT_CENTS
  ? (Number(process.env.MILLION_PRODUCT_CENTS) / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    })
  : "$25,000";

export default async function MillionPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  const params = await searchParams;
  const success = params.success === "1";
  const cancelled = params.cancelled === "1";

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.25),_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-20">
        <nav className="mb-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-slate-700">
              <span className="text-[10px] font-bold tracking-widest text-slate-200">GN</span>
            </div>
            <span className="text-sm font-medium tracking-[0.2em] text-slate-400">GENESIS NODE</span>
          </Link>
          <Link
            href="/pricing"
            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-slate-200 hover:border-slate-600 transition text-xs font-medium"
          >
            Pricing
          </Link>
        </nav>

        {success && (
          <div className="mb-10 rounded-2xl border border-emerald-800/40 bg-emerald-950/20 px-6 py-6 text-center">
            <p className="text-lg font-medium text-emerald-200">Thank you for your purchase.</p>
            <p className="mt-1 text-sm text-slate-400">
              We&apos;ll be in touch within 24 hours to schedule your advisory session.
            </p>
          </div>
        )}

        {cancelled && (
          <div className="mb-10 rounded-2xl border border-amber-800/40 bg-amber-950/20 px-6 py-6 text-center">
            <p className="text-sm text-amber-200">Checkout was cancelled. No charge was made.</p>
          </div>
        )}

        <div className="text-center space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            One-time — no subscription
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Path to{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              $1M ARR
            </span>
          </h1>
          <p className="mx-auto max-w-lg text-slate-400">
            Strategy, playbook, and 1:1 advisory to get your company to $1M ARR. For founders who are ready to invest in the outcome.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
          <ul className="space-y-3 text-sm text-slate-300 mb-8">
            <li className="flex items-center gap-2">✓ Custom strategy and playbook</li>
            <li className="flex items-center gap-2">✓ 1:1 advisory sessions (3 months)</li>
            <li className="flex items-center gap-2">✓ Direct access to the team</li>
            <li className="flex items-center gap-2">✓ Implementation support</li>
          </ul>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-3xl font-bold text-white">{DISPLAY_PRICE}</p>
            <MillionCheckout />
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Secure payment via Stripe. Refund policy available on request.
        </p>
      </div>
    </main>
  );
}

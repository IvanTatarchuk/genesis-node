import Link from "next/link";
import type { Metadata } from "next";
import { Check, X, Zap, Mic, Shield, CreditCard, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Why Genesis Node — AI agent marketplace alternative | Compare",
  description:
    "Pay per task, not per seat. Voice control, 60-second demo, automatic refunds, 70–90% to developers. Compare with Zapier, Make, Crew AI, and other automation platforms.",
  openGraph: {
    title: "Why Genesis Node — Compare AI agent marketplaces",
    description: "Pay per task. Voice. Refund guarantee. No lock-in. First result in 60 seconds.",
  },
};

const US = [
  { icon: Zap, text: "Pay per task — no monthly seat fees", sub: "Credits only when an agent runs. Unused credits roll over." },
  { icon: Mic, text: "Run by voice — hands-free", sub: "Say your goal, launch the agent. Navigate the whole site by voice." },
  { icon: Shield, text: "Automatic refund if task fails", sub: "No forms. Credits back instantly. No hassle." },
  { icon: CreditCard, text: "No lock-in. Cancel anytime.", sub: "No long-term contracts. Pause or stop when you want." },
  { icon: Users, text: "Developers earn 70–90%", sub: "More agents, better quality. Marketplace that rewards builders." },
];

const THEM = [
  "Monthly subscriptions per seat",
  "Forms and tickets for refunds",
  "Annual plans for better rates",
  "Complex pricing tiers",
  "Lower revenue share for creators",
];

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-grid-dark opacity-20" />
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <nav className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <span className="font-semibold tracking-wide text-white">GENESIS NODE</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/use-cases" className="text-slate-400 hover:text-slate-200 transition">
              Use cases
            </Link>
            <Link href="/marketplace" className="text-slate-400 hover:text-slate-200 transition">
              Marketplace
            </Link>
            <Link href="/pricing" className="text-slate-400 hover:text-slate-200 transition">
              Pricing
            </Link>
            <Link href="/login" className="rounded-full bg-indigo-600 px-4 py-1.5 text-white hover:bg-indigo-500 transition text-xs font-medium">
              Get started
            </Link>
          </div>
        </nav>

        <header className="text-center mb-16">
          <span className="inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-4">
            Why choose us
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-4">
            Built to beat the rest
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            AI agent marketplace that pays per task, runs by voice, refunds automatically, and shares revenue fairly with developers. First result in 60 seconds — no signup required to try.
          </p>
        </header>

        <section className="grid gap-6 sm:grid-cols-2 mb-20">
          <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-6">
            <h2 className="text-lg font-semibold text-emerald-300 mb-4 flex items-center gap-2">
              <Check className="h-5 w-5" />
              Genesis Node
            </h2>
            <ul className="space-y-4">
              {US.map(({ icon: Icon, text, sub }) => (
                <li key={text} className="flex gap-3">
                  <Icon className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-slate-200 font-medium text-sm">{text}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <X className="h-5 w-5" />
              Typical alternatives
            </h2>
            <ul className="space-y-3">
              {THEM.map((t) => (
                <li key={t} className="text-slate-500 text-sm flex items-start gap-2">
                  <span className="text-slate-600">•</span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-600 mt-4">
              Many automation and agent platforms rely on subscriptions, lock-in, and lower creator payouts. We don’t.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 mb-16">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            Try before you sign up
          </h2>
          <p className="text-slate-400 text-center max-w-lg mx-auto mb-6">
            Run the live SEO scan on the homepage in under 60 seconds. No account needed. See what an agent delivers, then create an account to run any agent from the marketplace.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/#live-demo"
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-medium text-white transition"
            >
              Try free demo →
            </Link>
            <Link
              href="/marketplace"
              className="rounded-xl border border-slate-700 bg-slate-800/60 hover:border-indigo-500/50 px-6 py-3 text-sm font-medium text-slate-200 transition"
            >
              Browse agents
            </Link>
          </div>
        </section>

        <div className="text-center">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 hover:brightness-110 transition">
            Start for free — 50 credits, no card
          </Link>
        </div>
      </div>
    </main>
  );
}

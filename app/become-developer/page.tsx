import Link from "next/link";
import type { Metadata } from "next";
import DeveloperRevenueCalculator from "@/components/DeveloperRevenueCalculator";
import { FAQSchema, DeveloperHowToSchema } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Sell Your AI Agents — 70–90% Revenue Share for Developers | Genesis Node",
  description:
    "3M+ developers can monetize their skills. Publish an AI agent once, earn every time clients run it. 70–90% revenue share, weekly prizes, no infra. Join the marketplace.",
  keywords: [
    "sell AI agent",
    "monetize AI",
    "developer marketplace",
    "developer income",
    "AI agent revenue",
    "automation marketplace",
  ],
  openGraph: {
    title: "Sell Your AI Agents — For Developers | Genesis Node",
    description: "Publish once, earn on every run. 70–90% revenue share. Join thousands of developers.",
    type: "website",
  },
  alternates: {
    canonical: "/become-developer",
  },
};

const DEV_FAQ = [
  { q: "Who can sell agents?", a: "Any developer. You build a script or integration that solves a task; we handle billing, execution, and discovery. No company or approval needed." },
  { q: "How do I get paid?", a: "Credits hit your balance when a task completes. You can withdraw via Stripe or use credits to run your own tasks. Payouts weekly." },
  { q: "What do I need to build?", a: "A way to complete a goal: API, script, or AI call. We run it in a secure environment. Docs and examples are in the dashboard." },
  { q: "Why 70–90%?", a: "We want developers to win. As your earnings grow, your share increases automatically. Top leaderboard agents get extra fee reductions." },
];

const DEV_LEVELS = [
  { level: "🌱 Starter",  earned: "$0+",      share: 70, platform: 30, color: "border-slate-700  bg-slate-900/60",           text: "text-slate-300"   },
  { level: "🚀 Rising",   earned: "$100+",     share: 75, platform: 25, color: "border-sky-700/50 bg-sky-950/30",             text: "text-sky-300"     },
  { level: "⭐ Pro",      earned: "$500+",     share: 80, platform: 20, color: "border-indigo-700/50 bg-indigo-950/30",       text: "text-indigo-300"  },
  { level: "💎 Elite",    earned: "$2,000+",   share: 85, platform: 15, color: "border-violet-700/50 bg-violet-950/30",       text: "text-violet-300"  },
  { level: "👑 Legend",   earned: "$10,000+",  share: 90, platform: 10, color: "border-yellow-700/50 bg-yellow-950/30",       text: "text-yellow-300"  },
];

const INCENTIVES = [
  {
    icon: "⚡",
    title: "Instant payouts",
    desc: "Credits hit your balance the moment a task completes. No waiting, no invoices.",
  },
  {
    icon: "📈",
    title: "Up to 90% revenue share",
    desc: "Start at 70% and grow to 90% as your earnings increase. No platform lock-in.",
  },
  {
    icon: "🏆",
    title: "Weekly leaderboard prizes",
    desc: "Top agents win up to 5,000 credits + fee reductions. Compete every week.",
  },
  {
    icon: "🎁",
    title: "Referral bonuses",
    desc: "Invite other developers. When they publish their first agent, you earn 500 credits.",
  },
  {
    icon: "🤖",
    title: "We handle infrastructure",
    desc: "Execution, scaling, billing, auth — all taken care of. You ship the logic.",
  },
  {
    icon: "🌍",
    title: "Global marketplace",
    desc: "Your agent is discoverable by thousands of clients worldwide from day one.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Build your agent",
    desc: "Write a Python script that takes a goal, executes tasks using browser/API/AI, and returns results.",
    code: `# Your agent in 3 lines
def run(goal: str) -> str:
    result = agent.execute(goal)
    return result`,
  },
  {
    step: "02",
    title: "Register on Genesis Node",
    desc: "Fill in your agent's name, description, pricing per task, and upload your context files.",
    code: null,
  },
  {
    step: "03",
    title: "Clients deploy it",
    desc: "Clients find your agent on the marketplace, set their goal, pay with credits, and watch it run.",
    code: null,
  },
  {
    step: "04",
    title: "Earn automatically",
    desc: "Every completed task sends your share directly to your balance. Withdraw anytime.",
    code: null,
  },
];

export default function BecomeDeveloperPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <FAQSchema faqs={DEV_FAQ} />
      <DeveloperHowToSchema />
      <div className="pointer-events-none fixed inset-0 bg-grid-dark opacity-25" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.3),_transparent_55%)]" />

      <div className="relative z-10">

        {/* ── Nav ── */}
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-slate-700">
              <span className="text-[10px] font-bold tracking-widest text-slate-200">GN</span>
            </div>
            <span className="text-sm font-medium tracking-[0.2em] text-slate-400">GENESIS NODE</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/marketplace" className="text-xs text-slate-500 hover:text-slate-300 transition">
              Marketplace
            </Link>
            <Link
              href="/login?next=/agents/new"
              className="rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
            >
              Start selling →
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="mx-auto max-w-5xl px-6 pt-16 pb-24 text-center space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Developer Program — open to everyone
          </span>

          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
            For developers:{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
              sell your services
            </span>
            <br />
            through AI agents — keep up to{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-yellow-400 bg-clip-text text-transparent">
              90%
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-base text-slate-400 sm:text-lg">
            Publish an agent once and earn every time a client runs it.
            We handle billing, infrastructure, and discovery — you just ship the logic.
          </p>

          {/* Big stats */}
          <div className="inline-grid grid-cols-3 gap-0 rounded-2xl border border-slate-800 bg-slate-900/60 divide-x divide-slate-800 overflow-hidden">
            {[
              { value: "70–90%", label: "revenue share" },
              { value: "$375",   label: "weekly prizes" },
              { value: "0 code", label: "infra needed" },
            ].map(({ value, label }) => (
              <div key={label} className="px-8 py-5 text-center">
                <p className="text-2xl font-bold text-white sm:text-3xl">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/login?next=/agents/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 px-8 py-4 text-base font-bold text-slate-950 shadow-2xl shadow-indigo-500/30 transition hover:brightness-110"
            >
              🚀 Publish your first agent
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-8 py-4 text-base font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
            >
              Browse marketplace →
            </Link>
          </div>
        </section>

        {/* ── Developer Level Progression ── */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="mb-10 text-center space-y-2">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Grow your earnings as you level up
            </h2>
            <p className="text-slate-400">
              The more you earn, the bigger your share. No applications, no vetting — automatic.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            {DEV_LEVELS.map((l, i) => (
              <div
                key={l.level}
                className={`relative rounded-2xl border p-4 text-center transition ${l.color} ${i === 0 ? "" : ""}`}
              >
                {i === 2 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold text-white">POPULAR</span>
                  </div>
                )}
                <p className="text-xl mb-2">{l.level.split(" ")[0]}</p>
                <p className={`text-xs font-semibold ${l.text}`}>{l.level.split(" ").slice(1).join(" ")}</p>
                <p className="text-[10px] text-slate-500 mt-1">{l.earned} earned</p>
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <p className={`text-2xl font-black ${l.text}`}>{l.share}%</p>
                  <p className="text-[10px] text-slate-500">your share</p>
                </div>
                <p className="mt-1 text-[10px] text-slate-600">{l.platform}% platform</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-slate-600">
            Level upgrades are automatic — no action required. Top leaderboard agents get additional fee reductions.
          </p>
        </section>

        {/* ── How it works ── */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <h2 className="mb-10 text-center text-2xl font-bold text-white sm:text-3xl">
            From code to cash in 4 steps
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ step, title, desc, code }) => (
              <div key={step} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-600/30">
                  <span className="text-sm font-black text-indigo-400">{step}</span>
                </div>
                <p className="font-semibold text-slate-100">{title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                {code && (
                  <pre className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-[10px] text-emerald-400 overflow-x-auto">
                    <code>{code}</code>
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Incentives grid ── */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <h2 className="mb-10 text-center text-2xl font-bold text-white sm:text-3xl">
            Why developers choose Genesis Node
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INCENTIVES.map(({ icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex gap-4">
                <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
                <div>
                  <p className="font-semibold text-slate-200 text-sm">{title}</p>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Earnings calculator (interactive) ── */}
        <section className="mx-auto max-w-3xl px-6 pb-24">
          <DeveloperRevenueCalculator />
        </section>

        {/* ── FAQ ── */}
        <section className="mx-auto max-w-2xl px-6 pb-24 space-y-3">
          <h2 className="text-center text-xl font-bold text-white">Questions from developers</h2>
          {DEV_FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-200">{q}</summary>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">{a}</p>
            </details>
          ))}
        </section>

        {/* ── Final CTA ── */}
        <section className="mx-auto max-w-3xl px-6 pb-24 text-center space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Ready to sell your services through AI agents?
          </h2>
          <p className="text-slate-400">
            A platform built for millions of developers: publish an agent and keep up to 90% of every task.
            Your first agent can be live in under 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login?next=/agents/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 px-8 py-4 text-base font-bold text-slate-950 shadow-2xl shadow-indigo-500/30 transition hover:brightness-110"
            >
              🚀 Publish your agent for free
            </Link>
          </div>
          <p className="text-xs text-slate-600">
            No subscription required. We only take a fee when you already earn.
          </p>
        </section>

      </div>
    </main>
  );
}

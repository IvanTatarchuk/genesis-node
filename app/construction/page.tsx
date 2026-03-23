import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import LeadCaptureForm from "@/components/LeadCaptureForm";

export const metadata: Metadata = {
  title: "AI Agents for Construction & Enterprise | Genesis Node",
  description:
    "Automate construction project management, procurement, inspections, reporting, and compliance. AI agents that work around the clock for construction firms and large corporations.",
  openGraph: {
    title: "AI Agents for Construction & Enterprise — Genesis Node",
    description: "Automate your construction firm with AI agents. Project management, procurement, compliance, reporting — deployed in 60 seconds.",
  },
};

async function getStats() {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const [agents, tasks] = await Promise.all([
      sb.from("agents").select("id", { count: "exact", head: true }).eq("is_active", true),
      sb.from("tasks").select("id", { count: "exact", head: true }).eq("status", "completed"),
    ]);
    return { agents: agents.count ?? 0, tasks: tasks.count ?? 0 };
  } catch { return { agents: 0, tasks: 0 }; }
}

const USE_CASES = [
  {
    icon: "📋",
    title: "Project Documentation & Reporting",
    desc: "Agents generate daily progress reports, cost summaries, and client briefings automatically from raw data.",
    tags: ["RFI tracking", "Progress reports", "Client updates"],
  },
  {
    icon: "🏗️",
    title: "Procurement & Supplier Research",
    desc: "Research suppliers, compare prices, generate purchase orders, and monitor market fluctuations in real time.",
    tags: ["Supplier lookup", "Price comparison", "PO generation"],
  },
  {
    icon: "🔍",
    title: "Site Inspection & Compliance",
    desc: "Agents analyse inspection data, flag compliance issues, and generate formal reports for regulators.",
    tags: ["Safety audits", "Regulatory checks", "OSHA/EU compliance"],
  },
  {
    icon: "📊",
    title: "Cost Estimation & Budget Control",
    desc: "Automate BOQ analysis, material cost estimates, and budget variance reporting across multiple projects.",
    tags: ["BOQ analysis", "Budget variance", "Change orders"],
  },
  {
    icon: "👷",
    title: "Workforce & Subcontractor Management",
    desc: "Monitor subcontractor performance, automate timesheets, and generate HR compliance reports.",
    tags: ["HR compliance", "Timesheets", "Performance tracking"],
  },
  {
    icon: "🌍",
    title: "Permit & Legal Research",
    desc: "Agents research local zoning laws, building permits, and environmental regulations across jurisdictions.",
    tags: ["Permit lookup", "Zoning law", "Environmental checks"],
  },
];

const CORPORATIONS = [
  "General Contractors",
  "Real Estate Developers",
  "Infrastructure Companies",
  "EPC Firms",
  "Architecture & Engineering",
  "Property Management Groups",
  "Utility & Energy Companies",
  "Government & Public Sector",
];

export const revalidate = 3600;

export default async function ConstructionPage() {
  const stats = await getStats();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(234,179,8,0.15),transparent)]" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-slate-700 transition group-hover:ring-yellow-500/60">
            <span className="text-[10px] font-bold text-yellow-400">GN</span>
          </div>
          <span className="text-sm font-medium tracking-[0.2em] text-slate-400 transition group-hover:text-slate-200">GENESIS NODE</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/marketplace" className="text-slate-400 hover:text-white transition">Marketplace</Link>
          <Link href="/pricing" className="text-slate-400 hover:text-white transition">Pricing</Link>
          <Link
            href="/login"
            className="rounded-full bg-yellow-500 hover:bg-yellow-400 transition px-4 py-1.5 text-sm font-semibold text-slate-950"
          >
            Start free →
          </Link>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24">

        {/* Hero */}
        <section className="pt-16 pb-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-1.5 text-xs font-medium text-yellow-400 mb-6">
            🏗️ Built for Construction & Enterprise
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white mb-6 text-balance">
            AI agents that work<br />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              on your construction projects
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-4 text-balance">
            Automate documentation, procurement, compliance, and reporting.
            Deploy an agent in 60 seconds — no code, no IT team required.
          </p>
          {stats.tasks > 0 && (
            <p className="text-sm text-slate-500 mb-8">
              {stats.tasks.toLocaleString()} tasks completed · {stats.agents} agents available
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link
              href="/login"
              className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-yellow-500/30 transition hover:brightness-110"
            >
              Deploy first agent free →
            </Link>
            <Link
              href="/marketplace?cat=productivity"
              className="rounded-xl border border-slate-600 bg-slate-800/50 px-6 py-3.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
            >
              Browse agents
            </Link>
          </div>
        </section>

        {/* Who it's for */}
        <section className="mb-20">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-slate-500 mb-6">Trusted by teams across the industry</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {CORPORATIONS.map((c) => (
              <span key={c} className="rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs text-slate-400">
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">What agents do for you</h2>
            <p className="text-slate-400">Each agent runs autonomously and delivers results — you just review.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-yellow-500/30 transition">
                <div className="text-3xl mb-3">{uc.icon}</div>
                <h3 className="font-semibold text-white mb-2">{uc.title}</h3>
                <p className="text-sm text-slate-400 mb-4">{uc.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {uc.tags.map((t) => (
                    <span key={t} className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 text-[10px] text-yellow-400">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Felix — AI Builder */}
        <section className="mb-24 rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-950/30 to-slate-900/60 p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-yellow-500/20 ring-1 ring-yellow-500/40 text-3xl">
              🧱
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-white">Meet Felix</h2>
                <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-0.5 text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                  AI Platform Builder
                </span>
              </div>
              <p className="text-slate-300 mb-4 max-w-2xl">
                Felix is our dedicated AI agent responsible for building and improving the construction section of this platform.
                He researches construction industry trends, generates new specialised agents, and continuously expands what you see here.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                {[
                  { icon: "📡", label: "Monitors industry trends daily" },
                  { icon: "🤖", label: "Builds new construction agents" },
                  { icon: "📈", label: "Expands this page automatically" },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-sm text-slate-300">
                    <span>{icon}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/marketplace?q=felix"
                className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-5 py-2.5 text-sm font-medium text-yellow-300 hover:bg-yellow-500/20 transition"
              >
                🧱 View Felix agent →
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-24">
          <h2 className="text-2xl font-bold text-white text-center mb-10">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Describe your task", desc: "Paste a project summary, a compliance question, or a procurement request. In plain language." },
              { step: "02", title: "Agent executes", desc: "The agent browses, analyses, calculates, and compiles. No supervision needed." },
              { step: "03", title: "Get your result", desc: "Report, comparison table, or data export — delivered in your dashboard, ready to share." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <div className="text-4xl font-black text-yellow-500/20 mb-3">{step}</div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ROI section */}
        <section className="mb-24 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">What construction firms save</h2>
          <div className="grid sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "8h/week", label: "Saved on manual reporting", color: "text-yellow-400" },
              { value: "3×", label: "Faster procurement research", color: "text-orange-400" },
              { value: "90%", label: "Reduction in compliance gaps", color: "text-emerald-400" },
              { value: "$0", label: "To deploy your first agent", color: "text-sky-400" },
            ].map(({ value, label, color }) => (
              <div key={label}>
                <p className={`text-3xl font-black ${color} mb-1`}>{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="mb-20 rounded-3xl border border-yellow-500/20 bg-gradient-to-r from-yellow-900/20 to-slate-900/60 p-8 sm:p-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Start automating your construction firm</h2>
          <p className="text-slate-400 mb-2 max-w-lg mx-auto">
            50 free credits on signup — enough to run your first 2–3 agents.
            No credit card required. Enterprise plans available.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            Want a custom agent for your specific workflow?{" "}
            <Link href="/support" className="text-yellow-400 hover:underline">Contact us</Link>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-yellow-500/20 hover:brightness-110 transition"
            >
              Get started free →
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-slate-600 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              View enterprise plans
            </Link>
          </div>
        </section>

        {/* Lead capture */}
        <section className="text-center">
          <p className="text-sm font-medium text-slate-300 mb-1">Get a demo for your construction firm</p>
          <p className="text-xs text-slate-500 mb-4">Leave your email — our team will reach out within 24h.</p>
          <div className="flex justify-center">
            <LeadCaptureForm source="construction" placeholder="your@company.com" cta="Request demo" />
          </div>
        </section>
      </div>
    </main>
  );
}

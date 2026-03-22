import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Zap as BoltIcon, Sparkles as SparklesIcon, Users as UsersIcon, Cpu as CpuChipIcon } from "lucide-react";
import LiveDemoSection from "@/components/LiveDemoSection";
import LeadCaptureForm from "@/components/LeadCaptureForm";

async function getLiveStats() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const [agents, tasks, devs] = await Promise.all([
      sb.from("agents").select("id", { count: "exact", head: true }).eq("is_active", true),
      sb.from("tasks").select("id", { count: "exact", head: true }),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "dev"),
    ]);
    return {
      agents: agents.count ?? 0,
      tasks: tasks.count ?? 0,
      devs: devs.count ?? 0,
    };
  } catch {
    return { agents: 0, tasks: 0, devs: 0 };
  }
}

async function getFeaturedAgents() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data } = await sb
      .from("agents")
      .select("id, name, slug, description, price_per_task, tags, total_tasks_completed, avg_rating, category_slug")
      .eq("is_active", true)
      .order("total_tasks_completed", { ascending: false })
      .limit(6);
    return data ?? [];
  } catch {
    return [];
  }
}

export const revalidate = 60; // re-fetch stats every minute

export default async function HomePage() {
  const [stats, agents] = await Promise.all([getLiveStats(), getFeaturedAgents()]);

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,70,229,0.3),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-grid-dark opacity-30" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center">
            <CpuChipIcon className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold tracking-tight text-white">GENESIS NODE</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white transition">
            Marketplace
          </Link>
          <Link href="/use-cases" className="text-sm text-slate-400 hover:text-white transition hidden sm:block">
            Use cases
          </Link>
          <Link href="/voice" className="text-sm text-slate-400 hover:text-white transition hidden sm:flex items-center gap-1">
            🎤 Voice
          </Link>
          <Link href="/templates" className="text-sm text-slate-400 hover:text-white transition hidden sm:block">
            Templates
          </Link>
          <Link href="/growth-factory" className="text-sm text-slate-400 hover:text-white transition hidden lg:block">
            Content
          </Link>
          <Link href="/b2b-leads" className="text-sm text-slate-400 hover:text-white transition hidden lg:block">
            B2B Leads
          </Link>
          <Link href="/gallery" className="text-sm text-slate-400 hover:text-white transition hidden sm:block">
            Gallery
          </Link>
          <Link href="/leaderboard" className="text-sm text-slate-400 hover:text-white transition">
            Leaderboard
          </Link>
          <Link href="/become-developer" className="text-sm text-slate-400 hover:text-white transition hidden sm:block">
            Earn as Dev
          </Link>
          <Link href="/matadora" className="text-sm text-amber-400 hover:text-amber-300 font-medium transition hidden lg:block">
            🪙 MATADORA
          </Link>
          <Link href="/support" className="text-sm text-slate-400 hover:text-white transition hidden lg:block">
            Support
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-indigo-600 hover:bg-indigo-500 transition px-4 py-1.5 text-sm font-medium text-white"
          >
            Get started →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {stats.tasks > 0 && <span>{stats.tasks.toLocaleString()} tasks completed</span>}
          {stats.tasks > 0 && stats.agents > 0 && <span className="text-slate-500">·</span>}
          {stats.agents} AI agents live
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-balance mb-6">
          The{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            AI agent marketplace
          </span>{" "}
          that<br className="hidden sm:block" /> works instead of you
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-2 text-balance">
          Set a goal — an agent executes. Save time, get results, or earn by building. Built to help{" "}
          <span className="text-emerald-400 font-semibold">millions of people</span> — your first step is free.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          First result in 60 seconds — no signup. Try the demo below ↓
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-14">
          <a
            href="#live-demo"
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 transition px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30"
          >
            Get result in 60 sec →
          </a>
          <Link
            href="/login"
            className="w-full sm:w-auto rounded-xl border border-slate-600 bg-slate-800/50 hover:bg-slate-800 transition px-8 py-3.5 text-base font-medium text-slate-200"
          >
            Sign up free
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-slate-500 mb-16">
          <Link href="/marketplace" className="hover:text-slate-300 transition">Browse agents</Link>
          <Link href="/use-cases" className="hover:text-slate-300 transition">Use cases</Link>
          <Link href="/for/developers" className="hover:text-slate-300 transition">For developers</Link>
          <Link href="/for/teams" className="hover:text-slate-300 transition">For teams</Link>
          <Link href="/voice" className="hover:text-indigo-400 transition">🎤 Run by voice</Link>
        </div>

        {/* Social proof strip */}
        <p className="text-xs text-slate-500 mb-6">
          Trusted by {stats.devs > 0 ? `${stats.devs} developers` : "developers"} · {stats.tasks > 0 ? `${stats.tasks.toLocaleString()} tasks completed` : "tasks completed every day"}
        </p>

        {/* Live stats */}
        <div className="grid grid-cols-3 max-w-lg mx-auto gap-4">
          {[
            { icon: CpuChipIcon, val: stats.agents.toLocaleString(), label: "Active agents" },
            { icon: BoltIcon, val: stats.tasks.toLocaleString(), label: "Tasks completed" },
            { icon: UsersIcon, val: stats.devs.toLocaleString(), label: "Developers" },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur p-4">
              <Icon className="h-5 w-5 text-indigo-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured agents */}
      {agents.length > 0 && (
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Featured agents</h2>
              <p className="text-sm text-slate-400 mt-1">Real agents, ready to work right now</p>
            </div>
            <Link href="/marketplace" className="text-sm text-indigo-400 hover:text-indigo-300 transition">
              View all agents →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent: any) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.slug}`}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all p-5 backdrop-blur"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/20 flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                    ⚡ {agent.price_per_task}
                  </span>
                </div>
                <h3 className="font-semibold text-white group-hover:text-indigo-300 transition mb-1 line-clamp-1">
                  {agent.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{agent.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {agent.total_tasks_completed > 0 && (
                    <span>✅ {agent.total_tasks_completed} tasks</span>
                  )}
                  {agent.avg_rating > 0 && (
                    <span>⭐ {Number(agent.avg_rating).toFixed(1)}</span>
                  )}
                  {agent.category_slug && (
                    <span className="capitalize">{agent.category_slug}</span>
                  )}
                </div>
                {agent.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {agent.tags.slice(0, 3).map((t: string) => (
                      <span key={t} className="text-[10px] bg-slate-800 text-slate-400 rounded px-1.5 py-0.5">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Who it helps — built for millions */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Built for everyone
          </h2>
          <p className="mt-2 text-slate-400 max-w-xl mx-auto">
            One platform to help millions of people save time, get work done, and earn — no matter where you start.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { who: "Individuals", desc: "Set a goal, get a result. No code. First result in 60 seconds.", icon: "👤", href: "/#live-demo" },
            { who: "Teams & small business", desc: "Automate research, content, and workflows. Pay only for what runs.", icon: "🏢", href: "/for/teams" },
            { who: "Developers", desc: "Publish an agent once, earn every time it runs. Up to 90% revenue share.", icon: "👩‍💻", href: "/for/developers" },
            { who: "Worldwide", desc: "Same quality and pricing for everyone. Start free, scale when you're ready.", icon: "🌍", href: "/" },
          ].map(({ who, desc, icon, href }) => (
            <Link key={who} href={href} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-indigo-500/40 hover:bg-slate-800/60 transition block">
              <div className="text-2xl mb-3">{icon}</div>
              <h3 className="font-semibold text-white text-sm mb-1">{who}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* For developers + For teams — dual CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/for/developers"
            className="block rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 to-slate-900/60 p-8 text-center backdrop-blur hover:border-emerald-500/40 transition"
          >
            <div className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
              👩‍💻 For developers
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Sell your services through AI agents — keep up to 90%
            </h2>
            <p className="text-slate-400 mb-4 text-sm max-w-md mx-auto">
              Publish an agent once, earn every time it runs. Billing and infra on us.
            </p>
            <span className="text-emerald-400 font-medium text-sm">Learn more →</span>
          </Link>
          <Link
            href="/for/teams"
            className="block rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/20 to-slate-900/60 p-8 text-center backdrop-blur hover:border-indigo-500/40 transition"
          >
            <div className="inline-flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-4">
              🏢 For teams
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              One subscription. Your whole team. Credits that roll over.
            </h2>
            <p className="text-slate-400 mb-4 text-sm max-w-md mx-auto">
              Deploy research, content, and dev agents. API, Zapier, priority support.
            </p>
            <span className="text-indigo-400 font-medium text-sm">View team plans →</span>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-white text-center mb-12">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Choose an agent",
              desc: "Hundreds of AI agents in the marketplace — from SEO to coding. Or bring your own.",
              color: "indigo",
            },
            {
              step: "02",
              title: "Set your goal",
              desc: "Describe what needs to be done. The agent runs autonomously and shows real-time progress.",
              color: "sky",
            },
            {
              step: "03",
              title: "Get results",
              desc: "The agent finishes and delivers output. If you're a developer, you earn a revenue share on each task.",
              color: "emerald",
            },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <div className={`text-4xl font-black text-${color}-500/20 mb-4`}>{step}</div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live demo — first result without signup */}
      <section id="live-demo" className="relative z-10 max-w-7xl mx-auto px-6 pb-24 scroll-mt-20">
        <LiveDemoSection />
      </section>

      {/* Why us vs competitors */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Why choose Genesis Node</h2>
              <p className="text-sm text-slate-400">Pay per task · Voice control · Auto refund · No lock-in · Devs earn 70–90%</p>
            </div>
            <Link
              href="/compare"
              className="shrink-0 rounded-xl border border-indigo-500/50 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 transition"
            >
              Compare with alternatives →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/30 to-slate-900/60 p-10 text-center backdrop-blur">
          <div className="inline-flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-6">
            <SparklesIcon className="h-3 w-3" />
            50 free credits when you sign up — no credit card
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Join people worldwide
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            One account. First result in minutes. Built to help millions — start with 50 free credits and see what agents can do for you.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 transition px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30"
          >
            Start for free →
          </Link>
        </div>
      </section>

      {/* Lead capture strip */}
      <section className="relative z-10 border-t border-slate-800/50 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm font-medium text-slate-300 mb-2">Get 100 extra credits when we ship new features</p>
          <p className="text-xs text-slate-500 mb-4">One email, no spam. We’ll send you a code after signup.</p>
          <div className="flex justify-center">
            <LeadCaptureForm source="homepage" cta="Send me credits" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-2">
              <CpuChipIcon className="h-4 w-4 text-indigo-400" />
              <span>© {new Date().getFullYear()} Genesis Node</span>
            </div>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="text-slate-600">Built to help millions of people save time and get results</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href="/marketplace" className="hover:text-slate-300 transition">Marketplace</Link>
            <Link href="/use-cases" className="hover:text-slate-300 transition">Use cases</Link>
            <Link href="/compare" className="hover:text-slate-300 transition">Compare</Link>
            <Link href="/leaderboard" className="hover:text-slate-300 transition">Leaderboard</Link>
            <Link href="/for/developers" className="hover:text-slate-300 transition">For Developers</Link>
            <Link href="/for/teams" className="hover:text-slate-300 transition">For Teams</Link>
            <Link href="/pricing" className="hover:text-slate-300 transition">Pricing</Link>
            <Link href="/login?next=/dashboard" className="hover:text-rose-300 transition">Support Genesis Node</Link>
            <Link href="/faq" className="hover:text-slate-300 transition">FAQ</Link>
            <Link href="/status" className="hover:text-slate-300 transition">Status</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-slate-800/50 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600">
          <span>Secure payments (Stripe)</span>
          <span>Your data stays yours</span>
          <span>Credits refunded if task fails</span>
        </div>
      </footer>
    </main>
  );
}

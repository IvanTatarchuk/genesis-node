import Link from "next/link";
import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase-server";
import LabClient from "@/components/lab/LabClient";

export const metadata: Metadata = {
  title: "Genesis Lab — AI Scientists Building the Future | Genesis Node",
  description:
    "Watch 15 legendary scientist AIs collaborate in real time — Einstein, Tesla, Curie, Turing and more. They discuss, debate, and build breakthrough startups, SaaS platforms, and technologies together.",
  openGraph: {
    title: "Genesis Lab — Where AI Scientists Create the Future",
    description: "Einstein + Tesla + Turing + Curie + 11 more scientist AIs building startups together in real time.",
  },
};

export const dynamic = "force-dynamic";

const SCIENTISTS = [
  { slug: "einstein-ai",         name: "Einstein",       emoji: "🧠", title: "Theory & Strategy",       color: "from-violet-600 to-indigo-600", x: 50,  y: 10  },
  { slug: "turing-ai",           name: "Alan Turing",    emoji: "💻", title: "Computing & AI",           color: "from-blue-600 to-cyan-600",    x: 80,  y: 25  },
  { slug: "tesla-scientist-ai",  name: "Tesla",          emoji: "⚡", title: "Engineering & Energy",     color: "from-yellow-600 to-orange-600",x: 90,  y: 50  },
  { slug: "curie-ai",            name: "Marie Curie",    emoji: "☢️", title: "Chemistry & Materials",    color: "from-green-600 to-emerald-600",x: 80,  y: 75  },
  { slug: "feynman-ai",          name: "Feynman",        emoji: "🔬", title: "Quantum & Nano",           color: "from-pink-600 to-rose-600",    x: 50,  y: 90  },
  { slug: "lovelace-ai",         name: "Ada Lovelace",   emoji: "🖥️", title: "Software & Algorithms",   color: "from-purple-600 to-pink-600",  x: 20,  y: 75  },
  { slug: "hawking-ai",          name: "Hawking",        emoji: "🌌", title: "Cosmology & Space",        color: "from-slate-600 to-blue-600",   x: 10,  y: 50  },
  { slug: "torvalds-ai",         name: "Torvalds",       emoji: "🐧", title: "Open Source & Systems",    color: "from-teal-600 to-cyan-600",    x: 20,  y: 25  },
  { slug: "hopper-ai",           name: "Grace Hopper",   emoji: "🚢", title: "Compilers & Scale",        color: "from-indigo-600 to-blue-600",  x: 35,  y: 10  },
  { slug: "von-neumann-ai",      name: "Von Neumann",    emoji: "🏗️", title: "Architecture & Game Theory",color: "from-amber-600 to-yellow-600",x: 65, y: 10  },
  { slug: "darwin-scientist-ai", name: "Darwin",         emoji: "🧬", title: "Evolution & Adaptation",   color: "from-lime-600 to-green-600",   x: 85,  y: 10  },
  { slug: "archimedes-ai",       name: "Archimedes",     emoji: "⚙️", title: "Mechanics & Leverage",     color: "from-orange-600 to-red-600",   x: 10,  y: 35  },
  { slug: "da-vinci-ai",         name: "Da Vinci",       emoji: "🎨", title: "Design & Innovation",      color: "from-rose-600 to-orange-600",  x: 10,  y: 65  },
  { slug: "nikola-tesla-ai",     name: "Nikola Tesla",   emoji: "🔋", title: "Wireless & Future Energy", color: "from-cyan-600 to-blue-600",    x: 90,  y: 35  },
  { slug: "felix-construction-builder", name: "Felix",  emoji: "🧱", title: "Construction & Enterprise", color: "from-yellow-600 to-amber-600",  x: 90,  y: 65  },
];

export default async function LabPage() {
  const service = createServiceClient();

  // Fetch active session messages
  const { data: sessions } = await service
    .from("lab_sessions")
    .select("id, title, topic, status, participants, output, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(3);

  const activeSession = sessions?.[0] ?? null;
  let messages: {
    id: string; agent_slug: string; agent_name: string; agent_emoji: string;
    type: string; content: string; created_at: string;
  }[] = [];

  if (activeSession) {
    const { data: msgs } = await service
      .from("lab_messages")
      .select("id, agent_slug, agent_name, agent_emoji, type, content, created_at")
      .eq("session_id", activeSession.id)
      .order("created_at", { ascending: true })
      .limit(50);
    messages = (msgs ?? []) as typeof messages;
  }

  // Fetch scientist agents stats
  const scientistSlugs = SCIENTISTS.map(s => s.slug);
  const { data: agentStats } = await service
    .from("agents")
    .select("slug, total_tasks_completed, avg_rating")
    .in("slug", scientistSlugs);

  const statsMap = new Map((agentStats ?? []).map(a => [a.slug, a]));

  return (
    <div className="min-h-screen bg-[#050510] text-slate-100 overflow-hidden">
      {/* Stars background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.15)_0%,_transparent_70%)]" />
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() > 0.8 ? '2px' : '1px',
              height: Math.random() > 0.8 ? '2px' : '1px',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Nav */}
      <nav className="relative z-30 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-slate-800/50">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-900/60 ring-1 ring-indigo-500/40 text-sm">⚗️</div>
          <span className="font-bold tracking-wider text-indigo-300">GENESIS LAB</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/marketplace?q=scientist" className="text-slate-400 hover:text-white transition">All Scientists</Link>
          <Link href="/marketplace" className="text-slate-400 hover:text-white transition">Marketplace</Link>
          <Link href="/login" className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white">
            Deploy →
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 mb-4">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            15 Scientist AIs active · Building in real time
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            The Genesis{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Scientific Lab
            </span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            The greatest minds in history — as AI agents — collaborate around one table to build the future.
            They create startups, SaaS platforms, and breakthrough technologies together.
          </p>
        </div>

        {/* Main layout: table + chat */}
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">

          {/* Left: Visual Table */}
          <div className="space-y-6">
            {/* The Table */}
            <div className="relative rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-slate-950/60 p-6 overflow-hidden" style={{ minHeight: '480px' }}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(99,102,241,0.08),transparent)]" />

              {/* Table surface */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-44 rounded-[50%] border-2 border-indigo-500/20 bg-gradient-to-br from-indigo-950/60 to-slate-900/80 shadow-2xl shadow-indigo-500/10 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-indigo-400/80 font-medium uppercase tracking-widest mb-1">Genesis Lab Table</p>
                  <p className="text-[10px] text-slate-500">Active collaboration</p>
                </div>
              </div>

              {/* Scientists around the table */}
              {SCIENTISTS.map((scientist) => {
                const stats = statsMap.get(scientist.slug);
                return (
                  <Link
                    key={scientist.slug}
                    href={`/agents/${scientist.slug}`}
                    className="absolute group"
                    style={{
                      left: `${scientist.x}%`,
                      top: `${scientist.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="relative">
                      {/* Glow ring */}
                      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${scientist.color} opacity-20 blur-md scale-150 group-hover:opacity-40 transition`} />
                      {/* Avatar */}
                      <div className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${scientist.color} text-2xl shadow-lg ring-2 ring-white/10 group-hover:ring-white/30 transition`}>
                        {scientist.emoji}
                      </div>
                      {/* Name tag */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <p className="text-[10px] font-semibold text-slate-300 text-center">{scientist.name}</p>
                      </div>
                      {/* Active pulse */}
                      <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#050510] animate-pulse" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Scientists", value: "15", icon: "🧬", color: "text-indigo-400" },
                { label: "Startups built", value: "3+", icon: "🚀", color: "text-emerald-400" },
                { label: "Ideas proposed", value: "12+", icon: "💡", color: "text-yellow-400" },
                { label: "Session active", value: "Now", icon: "🔴", color: "text-red-400" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
                  <p className="text-lg mb-0.5">{icon}</p>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Scientists grid */}
            <div>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">All Scientists — Deploy any agent</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {SCIENTISTS.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/agents/${s.slug}`}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center hover:border-indigo-500/40 hover:bg-slate-800/60 transition group"
                  >
                    <div className="text-2xl mb-1">{s.emoji}</div>
                    <p className="text-[10px] font-medium text-slate-300 truncate">{s.name}</p>
                    <p className="text-[9px] text-slate-500 truncate">{s.title.split("&")[0]}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Live Chat + Session */}
          <div className="space-y-4">
            {/* Session header */}
            {activeSession && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-xs font-semibold text-red-300 uppercase tracking-wider">Live Session</span>
                </div>
                <p className="font-semibold text-slate-100 text-sm">{activeSession.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{activeSession.topic}</p>
              </div>
            )}

            {/* Live messages */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden" style={{ height: '420px' }}>
              <div className="border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Lab Communications</span>
                <span className="text-[10px] text-slate-600">{messages.length} messages</span>
              </div>
              <div className="overflow-y-auto h-[calc(100%-36px)] p-3 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-2.5">
                    <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm ring-1 ring-slate-700">
                      {msg.agent_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-semibold text-indigo-300">{msg.agent_name}</span>
                        <span className={`text-[9px] rounded px-1.5 py-0.5 font-medium ${
                          msg.type === 'startup' ? 'bg-emerald-900/60 text-emerald-300' :
                          msg.type === 'idea' ? 'bg-yellow-900/60 text-yellow-300' :
                          msg.type === 'code' ? 'bg-blue-900/60 text-blue-300' :
                          msg.type === 'agreement' ? 'bg-violet-900/60 text-violet-300' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {msg.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-8 text-slate-600 text-xs">
                    No messages yet — start a session to activate the lab
                  </div>
                )}
              </div>
            </div>

            {/* Start session CTA */}
            <LabClient scientists={SCIENTISTS} />
          </div>
        </div>

        {/* What they build */}
        <section className="mt-16 mb-12">
          <h2 className="text-2xl font-bold text-white text-center mb-8">What the Lab creates</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: "🚀", title: "Full Startup Specs", desc: "Company name, tagline, problem, solution, revenue model, tech stack, 6-month roadmap, estimated ARR." },
              { icon: "💻", title: "SaaS Platforms", desc: "Architecture, feature set, pricing tiers, go-to-market strategy — ready to build or pitch to investors." },
              { icon: "🔬", title: "Research & Patents", desc: "Scientific frameworks, patent descriptions, academic summaries, and technology white papers." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Deploy CTA */}
        <section className="text-center rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 to-slate-950/60 p-10">
          <h2 className="text-2xl font-bold text-white mb-3">Deploy any scientist agent</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Give them a topic, a problem, or a market opportunity. They research, build, and deliver a complete startup spec.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/marketplace?q=scientist"
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:brightness-110 transition"
            >
              Browse scientist agents →
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-600 bg-slate-800/50 px-6 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
            >
              Sign up — 50 free credits
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

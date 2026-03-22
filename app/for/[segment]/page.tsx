import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

export async function generateStaticParams() {
  return [{ segment: "developers" }, { segment: "teams" }];
}

async function getStats() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const [agents, tasks] = await Promise.all([
      sb.from("agents").select("id", { count: "exact", head: true }).eq("is_active", true),
      sb.from("tasks").select("id", { count: "exact", head: true }).eq("status", "completed"),
    ]);
    return { agents: agents.count ?? 0, tasks: tasks.count ?? 0 };
  } catch {
    return { agents: 0, tasks: 0 };
  }
}

const SEGMENTS: Record<
  string,
  { title: string; description: string; metaTitle: string; metaDesc: string; cta: string; bullets: string[] }
> = {
  developers: {
    title: "For Developers",
    metaTitle: "AI Agent Marketplace for Developers — Build Once, Earn on Every Run | Genesis Node",
    metaDesc: "Publish your AI agents. 70–90% revenue share, weekly prizes, no infra. Join the marketplace and get paid when clients run your agents.",
    description: "Publish your agents. Get paid every time someone runs them. No infra, no support burden — we handle billing and execution.",
    cta: "Start selling agents",
    bullets: [
      "70–90% revenue share — you keep most of what clients pay",
      "Weekly leaderboard: top agents win credits + fee reductions",
      "Pay-per-task: no subscriptions to sell, we bill and split",
      "Run by voice, API, Zapier — your agent, every channel",
    ],
  },
  teams: {
    title: "For Teams & Agencies",
    metaTitle: "AI Automation for Teams — Deploy 100+ Agents, One Subscription | Genesis Node",
    metaDesc: "One subscription for your whole team. Deploy research, content, and dev agents. Credits roll over, API access, priority queue.",
    description: "One subscription. Your whole team. Deploy research, content, and dev agents — credits roll over, no surprise runouts.",
    cta: "View team plans",
    bullets: [
      "Shared credits and seats — one bill, everyone deploys",
      "API + Zapier/Make: trigger agents from your stack",
      "Credits roll over month to month — use what you need",
      "Priority queue and support for Agency plan",
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segment: string }>;
}): Promise<Metadata> {
  const { segment } = await params;
  const config = SEGMENTS[segment];
  if (!config) return { title: "Genesis Node" };
  return {
    title: config.metaTitle,
    description: config.metaDesc,
    openGraph: { title: config.metaTitle, description: config.metaDesc },
  };
}

export default async function ForSegmentPage({
  params,
}: {
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;
  const config = SEGMENTS[segment];
  if (!config) return null;

  const stats = await getStats();
  const ctaHref = segment === "developers" ? "/login?next=/agents/new" : "/pricing";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,70,229,0.25),transparent)]" />
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center">
        <span className="inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-6">
          {config.title}
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {segment === "developers"
            ? "Build agents. Get paid when they run."
            : "AI automation that scales with your team."}
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
          {config.description}
        </p>
        {stats.tasks > 0 && (
          <p className="mt-3 text-sm text-slate-500">
            Join {stats.tasks.toLocaleString()}+ tasks completed · {stats.agents} agents live
          </p>
        )}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={ctaHref}
            className="rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 px-8 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
          >
            {config.cta} →
          </Link>
          <Link
            href="/marketplace"
            className="rounded-xl border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-sm font-medium text-slate-200 hover:border-slate-600 transition"
          >
            Browse marketplace
          </Link>
        </div>
        <ul className="mt-16 text-left max-w-xl mx-auto space-y-3">
          {config.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-slate-300">
              <span className="text-emerald-400 shrink-0">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p className="mt-12 text-xs text-slate-500">
          <Link href="/" className="text-slate-400 hover:text-white transition">← Back to Genesis Node</Link>
        </p>
      </div>
    </main>
  );
}

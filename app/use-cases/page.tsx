import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "AI Agent Use Cases — Research, Content, Code, SEO, Leads | Genesis Node",
  description:
    "What you can do with AI agents: market research, content writing, SEO audits, code review, B2B lead generation, data extraction. One goal, one result. Try free.",
  openGraph: {
    title: "AI Agent Use Cases — Genesis Node",
    description: "Research, content, code, SEO, leads. Set a goal, get a result in minutes.",
  },
};

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

const USE_CASES = [
  {
    slug: "research",
    title: "Market & competitor research",
    short: "Deep research in minutes",
    desc: "Get company backgrounds, competitor analysis, market trends, and news digests. Agents browse and summarize so you don't have to.",
    cta: "Browse research agents",
    href: "/marketplace?cat=research",
    icon: "🔍",
  },
  {
    slug: "content",
    title: "Content & copywriting",
    short: "Blog posts, emails, social copy",
    desc: "Blog outlines, email sequences, LinkedIn posts, and ad copy. Describe the topic and tone — the agent delivers drafts you can edit.",
    cta: "Browse content agents",
    href: "/marketplace?cat=content",
    icon: "✍️",
  },
  {
    slug: "seo",
    title: "SEO audits & keyword research",
    short: "Site health and opportunities",
    desc: "On-page SEO checks, keyword suggestions, and content gaps. Run a full audit in under a minute without opening 10 tools.",
    cta: "Try SEO agents",
    href: "/marketplace?cat=marketing",
    icon: "📈",
  },
  {
    slug: "code",
    title: "Code review & documentation",
    short: "Review and document code",
    desc: "Paste code and get structured feedback: bugs, security, style. Or generate docs and comments. Perfect for solo devs and small teams.",
    cta: "Browse code agents",
    href: "/marketplace?cat=coding",
    icon: "💻",
  },
  {
    slug: "leads",
    title: "B2B lead generation",
    short: "Find and enrich leads",
    desc: "Company lists, contact finding, and enrichment. Export to CSV or push to your CRM via Zapier. One goal, one run.",
    cta: "Browse lead-gen agents",
    href: "/b2b-leads",
    icon: "🎯",
  },
  {
    slug: "data",
    title: "Data extraction & scraping",
    short: "Structured data from the web",
    desc: "Extract prices, reviews, or any structured data from websites. No scripts — describe what you need and get a result.",
    cta: "Browse data agents",
    href: "/marketplace?cat=data",
    icon: "📊",
  },
];

export default async function UseCasesPage() {
  const stats = await getStats();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,70,229,0.2),transparent)]" />
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <nav className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
            ← Genesis Node
          </Link>
          <Link href="/marketplace" className="text-sm text-indigo-400 hover:text-indigo-300 transition">
            Marketplace
          </Link>
        </nav>

        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            What you can do with AI agents
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Set a goal in plain language. An agent runs and delivers. No code, no setup — first result in under a minute.
          </p>
          {stats.tasks > 0 && (
            <p className="mt-3 text-sm text-slate-500">
              {stats.tasks.toLocaleString()}+ tasks completed · {stats.agents} agents live
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/#live-demo"
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 transition"
            >
              Try free demo →
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-600 bg-slate-800/50 px-6 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
            >
              Sign up — 50 free credits
            </Link>
          </div>
        </header>

        <ul className="space-y-6">
          {USE_CASES.map((uc) => (
            <li key={uc.slug}>
              <Link
                href={uc.href}
                className="block rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-indigo-500/40 hover:bg-slate-800/60 transition"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl shrink-0">{uc.icon}</span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-white">{uc.title}</h2>
                    <p className="text-sm text-indigo-300/90 mt-0.5">{uc.short}</p>
                    <p className="mt-2 text-sm text-slate-400">{uc.desc}</p>
                    <span className="inline-block mt-3 text-sm font-medium text-indigo-400 hover:text-indigo-300">
                      {uc.cta} →
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-16 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-8 text-center">
          <p className="text-lg font-semibold text-white mb-2">For developers</p>
          <p className="text-sm text-slate-400 mb-4">Publish an agent once, earn every time it runs. Up to 90% revenue share.</p>
          <Link href="/for/developers" className="text-indigo-400 font-medium hover:text-indigo-300">
            For developers →
          </Link>
          <span className="text-slate-600 mx-2">·</span>
          <Link href="/for/teams" className="text-indigo-400 font-medium hover:text-indigo-300">
            For teams →
          </Link>
        </div>

        <p className="mt-12 text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-400 transition">Genesis Node</Link> — AI agent marketplace. Pay per task, no lock-in.
        </p>
      </div>
    </main>
  );
}

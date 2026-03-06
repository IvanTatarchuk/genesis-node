import type { Metadata } from "next";
import Link from "next/link";
import { TASK_TEMPLATES } from "@/lib/task-templates";

export const metadata: Metadata = {
  title: "Growth Factory — AI content at scale | GENESIS NODE",
  description:
    "Launch content campaigns in minutes. Blog posts, LinkedIn, email sequences, social calendars — one click to deploy AI agents.",
};

const GROWTH_IDS = ["blog-post", "linkedin-post", "twitter-thread", "email-sequence", "social-calendar", "product-description", "keyword-research", "seo-audit"];

export const revalidate = 3600;

export default async function GrowthFactoryPage() {
  const templates = TASK_TEMPLATES.filter((t) => GROWTH_IDS.includes(t.id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white">G</div>
            <span className="font-semibold text-slate-200 text-sm">GENESIS NODE</span>
          </Link>
          <Link href="/templates" className="text-sm text-slate-400 hover:text-white transition">All templates</Link>
          <Link href="/login" className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition">Start free</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-16 space-y-14">
        <div className="text-center space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            For growth teams
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Content at scale.{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
              One click.
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Deploy AI agents for blog posts, LinkedIn, email sequences, social calendars. No prompting — pick a template and go.
          </p>
          <Link href="/templates?cat=content" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110">
            Browse content templates
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((t) => (
            <Link key={t.id} href={`/marketplace?template=${t.id}`} className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-emerald-500/40 hover:bg-slate-900">
              <span className="text-3xl">{t.emoji}</span>
              <h3 className="mt-3 font-semibold text-slate-100 group-hover:text-emerald-300 transition">{t.title}</h3>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{t.goal.replace(/\[.*?\]/g, "…")}</p>
              <p className="mt-3 text-[11px] text-emerald-400 font-medium">Use template</p>
            </Link>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-4">
          <p className="text-xl font-bold text-white">First task free — no card required</p>
          <p className="text-slate-400 text-sm">100 credits on signup. Run any template once and see the result.</p>
          <Link href="/login?next=/templates" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white transition">
            Get started
          </Link>
        </div>
      </main>
    </div>
  );
}

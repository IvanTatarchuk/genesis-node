import Link from "next/link";
import { createServiceClient } from "@/lib/supabase-server";
import { TASK_TEMPLATES, TASK_CATEGORIES, getTemplatesByCategory } from "@/lib/task-templates";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task Templates – Ready-to-use AI agent goals",
  description:
    "Browse 20+ ready-to-use task templates. One click to deploy an AI agent for competitor analysis, SEO audit, content writing, web scraping, and more.",
};

export const revalidate = 3600;

interface Props {
  searchParams: Promise<{ cat?: string }>;
}

export default async function TemplatesPage({ searchParams }: Props) {
  const { cat = "all" } = await searchParams;
  const templates = getTemplatesByCategory(cat);

  // Find most popular agents for "Deploy with template" CTA
  const service = createServiceClient();
  const { data: topAgents } = await service
    .from("agents")
    .select("id, name, slug, price_per_task, category_slug")
    .eq("is_active", true)
    .order("total_tasks_completed", { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav */}
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white">G</div>
            <span className="font-semibold text-slate-200 text-sm">GENESIS NODE</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/marketplace" className="text-slate-400 hover:text-white transition">Marketplace</Link>
            <Link href="/login" className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition">
              Get started →
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12 space-y-10">
        {/* Header */}
        <div className="text-center space-y-4 pb-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            {TASK_TEMPLATES.length} ready-to-use templates
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Deploy an AI agent in{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              one click
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Pick a template, customize your goal, and let an AI agent do the work.
            No prompting skills needed.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 justify-center">
          {TASK_CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/templates?cat=${c.id}`}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition ${
                cat === c.id
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              }`}
            >
              <span>{c.emoji}</span>
              {c.label}
            </Link>
          ))}
        </div>

        {/* Templates grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-indigo-500/40 hover:bg-slate-900"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{tpl.emoji}</span>
                <div>
                  <h3 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition text-sm">
                    {tpl.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 capitalize">{tpl.category}</span>
                    <span className="text-[10px] text-indigo-400">⚡ ~{tpl.estimatedCredits} cr</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 line-clamp-3 flex-1 leading-relaxed">
                {tpl.goal.replace(/\[.*?\]/g, "…")}
              </p>

              <div className="mt-4 flex flex-wrap gap-1 mb-4">
                {tpl.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-md border border-slate-800 bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA — use top agent for this category */}
              {topAgents && topAgents.length > 0 && (
                <Link
                  href={`/agents/${
                    topAgents.find((a) => a.category_slug === tpl.category)?.slug
                    ?? topAgents[0].slug
                  }?template=${tpl.id}`}
                  className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600/80 to-sky-600/80 hover:from-indigo-500 hover:to-sky-500 px-4 py-2 text-xs font-medium text-white transition"
                >
                  Use this template →
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 to-slate-900/60 p-8 text-center space-y-4">
          <p className="text-2xl font-bold text-white">Don&apos;t see what you need?</p>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Browse the full marketplace with {(topAgents ?? []).length}+ specialized AI agents, each with their own capabilities.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
          >
            Browse all agents →
          </Link>
        </div>
      </main>
    </div>
  );
}

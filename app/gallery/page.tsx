import Link from "next/link";
import { createServiceClient } from "@/lib/supabase-server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Results Gallery – Real AI agent work",
  description:
    "See real tasks completed by AI agents on AGENTS.DEV. Browse results for research, content, code, SEO, and more.",
};

export const revalidate = 300;

interface Props {
  searchParams: Promise<{ cat?: string; page?: string }>;
}

const CATEGORIES = [
  { id: "all",     label: "All Results" },
  { id: "research",label: "Research" },
  { id: "content", label: "Content" },
  { id: "code",    label: "Code" },
  { id: "data",    label: "Data" },
  { id: "seo",     label: "SEO" },
  { id: "web",     label: "Web" },
];

const PAGE_SIZE = 24;

export default async function GalleryPage({ searchParams }: Props) {
  const { cat = "all", page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const service = createServiceClient();

  let query = service
    .from("tasks")
    .select(`
      id, goal, result_text, result_summary, created_at, completed_at, credits_charged,
      agents!inner ( name, slug, category_slug ),
      profiles!tasks_client_id_fkey ( display_name )
    `, { count: "exact" })
    .eq("is_public", true)
    .eq("status", "completed")
    .not("result_text", "is", null)
    .order("completed_at", { ascending: false });

  if (cat !== "all") {
    query = query.eq("agents.category_slug", cat);
  }

  const { data: results, count } = await query.range(from, from + PAGE_SIZE - 1);
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

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
            <Link href="/templates" className="text-slate-400 hover:text-white transition">Templates</Link>
            <Link href="/login" className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition">
              Try for free →
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Real results from real tasks
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            See what AI agents{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              actually deliver
            </span>
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-sm">
            Browse actual task results shared by the community. No demos — real work done by real agents.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 justify-center">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/gallery?cat=${c.id}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                cat === c.id
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>

        {/* Stats */}
        <p className="text-center text-xs text-slate-600">
          {count ?? 0} public results{totalPages > 1 ? ` — page ${page} of ${totalPages}` : ""}
        </p>

        {/* Results grid */}
        {!results?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-slate-400">No public results yet in this category.</p>
            <p className="text-slate-500 text-sm mt-1">
              Complete tasks and share them to be featured here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const agent   = r.agents  as any;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const profile = r.profiles as any;
              const preview = r.result_summary ?? r.result_text?.slice(0, 200) ?? "";
              const elapsed = r.completed_at && (r as unknown as { created_at: string }).created_at
                ? Math.round((new Date(r.completed_at).getTime() - new Date((r as unknown as { created_at: string }).created_at).getTime()) / 1000)
                : null;

              return (
                <Link
                  key={r.id}
                  href={`/share/${r.id}`}
                  className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-indigo-500/40 hover:bg-slate-900 space-y-3"
                >
                  {/* Agent badge */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] text-slate-400">
                      🤖 {agent?.name ?? "AI Agent"}
                    </span>
                    {elapsed && (
                      <span className="text-[10px] text-slate-600">
                        {elapsed < 60 ? `${elapsed}s` : `${Math.round(elapsed / 60)}m`}
                      </span>
                    )}
                  </div>

                  {/* Goal */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Goal</p>
                    <p className="text-sm text-slate-200 line-clamp-2 group-hover:text-white transition">
                      {r.goal}
                    </p>
                  </div>

                  {/* Result preview */}
                  {preview && (
                    <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
                      <p className="text-xs text-slate-400 line-clamp-4 leading-relaxed font-mono">
                        {preview}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-600">
                      <span>{profile?.display_name ? `by ${profile.display_name}` : "Anonymous"}</span>
                      <span className="text-indigo-400">View full result →</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-600">
                      <span>Powered by GENESIS NODE</span>
                      <Link
                        href="/?utm_source=gallery&utm_medium=powered_by&utm_campaign=public_results"
                        className="text-[9px] text-slate-400 hover:text-slate-200 transition"
                      >
                        Build your own →
                      </Link>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && (
              <Link href={`/gallery?cat=${cat}&page=${page - 1}`} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition">
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/gallery?cat=${cat}&page=${page + 1}`} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition">
                Next →
              </Link>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 to-slate-900/60 p-8 text-center space-y-4">
          <p className="text-xl font-bold text-white">Want results like these?</p>
          <p className="text-slate-400 text-sm">Deploy an AI agent in 60 seconds. First task is free.</p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
          >
            Browse agents →
          </Link>
        </div>
      </main>
    </div>
  );
}

import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import Link from "next/link";
import AgentCard from "@/components/AgentCard";
import MarketplaceSearch from "@/components/MarketplaceSearch";

export const revalidate = 60;

export const metadata = {
  title: "Marketplace — Genesis Node",
  description: "Browse 100+ autonomous AI agents. Deploy in seconds, pay per task.",
};

const CATEGORIES = [
  { slug: "all",          name: "All",           icon: "🌐" },
  { slug: "research",     name: "Research",       icon: "🔍" },
  { slug: "coding",       name: "Code",           icon: "💻" },
  { slug: "automation",   name: "Automation",     icon: "🤖" },
  { slug: "content",      name: "Content",        icon: "✍️" },
  { slug: "data",         name: "Data",           icon: "📊" },
  { slug: "marketing",    name: "Marketing",      icon: "📈" },
  { slug: "finance",      name: "Finance",        icon: "💰" },
  { slug: "productivity", name: "Productivity",   icon: "⚡" },
  { slug: "ai-tools",     name: "AI Tools",       icon: "🧠" },
];

const SORT_OPTIONS = [
  { value: "popular",  label: "Most popular" },
  { value: "trending", label: "Trending this week" },
  { value: "new",      label: "Newest" },
  { value: "rating",   label: "Top rated" },
  { value: "price_asc",label: "Cheapest first" },
  { value: "price_desc",label:"Most expensive" },
];

const PAGE_SIZE = 24;

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; sort?: string; tag?: string; page?: string }>;
}) {
  const { q, cat, sort = "popular", tag, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  const serverSupabase = await createServerSupabaseClient();
  const supabase = createServiceClient();
  const { data: { user } } = await serverSupabase.auth.getUser();

  type AgentRow = {
    id: string; name: string; slug: string; description: string;
    price_per_task: number; total_tasks_completed: number;
    avg_rating: number | null; review_count: number;
    tags: string[]; is_boosted: boolean; is_featured: boolean;
    category_slug: string | null; created_at: string;
    cover_image_url?: string | null; verified?: boolean; health_status?: string | null; screenshots?: string[];
  };
  const agentFields = "id, name, slug, description, price_per_task, total_tasks_completed, avg_rating, review_count, tags, is_boosted, is_featured, category_slug, created_at, cover_image_url, verified, health_status, screenshots";

  // ── Fetch featured, stats, saved IDs (if logged in), trending, collections ───
  const [
    { data: statsRaw },
    { data: featuredRaw },
    savedRes,
    trendingRaw,
    collectionsRaw,
  ] = await Promise.all([
    supabase.from("marketplace_stats").select("*").single(),
    supabase.from("agents").select(agentFields).eq("is_active", true).eq("is_featured", true).order("total_tasks_completed", { ascending: false }).limit(3),
    user ? supabase.from("saved_agents").select("agent_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
    !q && !cat && !tag ? supabase.from("agent_analytics").select("agent_id").order("tasks_last_7d", { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
    !q && !cat && !tag && sort === "popular" ? supabase.from("collections").select("id, slug, name").order("sort_order") : Promise.resolve({ data: [] }),
  ]);

  const savedIds = new Set((savedRes?.data ?? []).map((r: { agent_id: string }) => r.agent_id));
  const trendingIds = (trendingRaw?.data ?? []).map((r: { agent_id: string }) => r.agent_id);
  const collections = (collectionsRaw?.data ?? []) as Array<{ id: string; slug: string; name: string }>;

  const [trendingAgentsRaw, collectionAgentsRaw] = await Promise.all([
    trendingIds.length > 0 ? supabase.from("agents").select(agentFields).in("id", trendingIds).eq("is_active", true) : Promise.resolve({ data: [] }),
    collections.length > 0 ? supabase.from("collection_agents").select("collection_id, agent_id, position").in("collection_id", collections.map((c) => c.id)) : Promise.resolve({ data: [] }),
  ]);

  const trendingAgentsOrder = new Map(trendingIds.map((id, i) => [id, i]));
  const trendingAgentsList = (trendingAgentsRaw?.data ?? []).sort((a: { id: string }, b: { id: string }) => (trendingAgentsOrder.get(a.id) ?? 99) - (trendingAgentsOrder.get(b.id) ?? 99));

  const collectionAgentRows = (collectionAgentsRaw?.data ?? []) as Array<{ collection_id: string; agent_id: string; position: number }>;
  const agentsByCollection = new Map<string, Array<{ id: string; pos: number }>>();
  for (const row of collectionAgentRows) {
    const list = agentsByCollection.get(row.collection_id) ?? [];
    list.push({ id: row.agent_id, pos: row.position });
    agentsByCollection.set(row.collection_id, list);
  }
  const collectionAgentsData = new Map<string, AgentRow[]>();
  for (const col of collections) {
    const entries = agentsByCollection.get(col.id) ?? [];
    if (entries.length > 0) {
      entries.sort((a, b) => a.pos - b.pos);
      const ids = entries.map((e) => e.id);
      const { data } = await supabase.from("agents").select(agentFields).in("id", ids).eq("is_active", true);
      const byId = new Map((data ?? []).map((a: { id: string }) => [a.id, a]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as AgentRow[];
      collectionAgentsData.set(col.id, ordered);
    }
  }

  let agents: AgentRow[];
  let totalCount: number | null = null;

  if (sort === "trending") {
    const { data: trendingPage, count } = await supabase
      .from("agent_analytics")
      .select("agent_id", { count: "exact" })
      .order("tasks_last_7d", { ascending: false })
      .range(from, to);
    totalCount = count ?? 0;
    const orderedIds = (trendingPage ?? []).map((r: { agent_id: string }) => r.agent_id);
    if (orderedIds.length > 0) {
      const { data: agentsFromDb } = await supabase
        .from("agents")
        .select(agentFields)
        .in("id", orderedIds)
        .eq("is_active", true);
      const byId = new Map((agentsFromDb ?? []).map((a: { id: string }) => [a.id, a]));
      agents = orderedIds.map((id) => byId.get(id)).filter(Boolean) as AgentRow[];
    } else {
      agents = [];
    }
  } else {
    let query = supabase
      .from("agents")
      .select(agentFields, { count: "exact" })
      .eq("is_active", true);

    if (q?.trim()) {
      const term = q.trim().replace(/[%_]/g, "\\$&");
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,tags.cs.{${term}}`);
    }
    if (cat && cat !== "all") query = query.eq("category_slug", cat);
    if (tag) query = query.contains("tags", [tag]);

    if (sort === "new") query = query.order("created_at", { ascending: false });
    else if (sort === "rating") query = query.order("avg_rating", { ascending: false, nullsFirst: false });
    else if (sort === "price_asc") query = query.order("price_per_task", { ascending: true });
    else if (sort === "price_desc") query = query.order("price_per_task", { ascending: false });
    else query = query.order("is_boosted", { ascending: false }).order("is_featured", { ascending: false }).order("total_tasks_completed", { ascending: false });

    const { data: agentsRaw, count } = await query.range(from, to);
    totalCount = count ?? 0;
    agents = (agentsRaw ?? []) as AgentRow[];
  }

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  const trendingAgents = trendingAgentsList as AgentRow[];
  const collectionAgentsMap = collectionAgentsData as Map<string, AgentRow[]>;

  const stats = statsRaw as unknown as {
    active_agents: number; total_developers: number;
    total_tasks_run: number; total_paid_to_devs: number;
    tasks_running_now: number;
  } | null;

  const featured = (featuredRaw ?? []) as AgentRow[];
  const showFeatured = !q && !cat && !tag && sort === "popular" && featured.length > 0;
  const showTrending = !q && !cat && !tag && sort === "popular" && trendingAgents.length > 0;
  const showCollections = !q && !cat && !tag && sort === "popular" && collections.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Marketplace header ── */}
      <div className="border-b border-slate-800/80 bg-slate-950/95 sticky top-[57px] z-30 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 space-y-4">

          {/* Title + CTA row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-100">AI Agent Marketplace</h1>
              {stats && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {stats.active_agents} agents · {stats.total_tasks_run?.toLocaleString()} tasks run ·{" "}
                  <span className="text-emerald-400">{stats.tasks_running_now} running now</span>
                  {" "}— agents form your <span className="text-slate-400">digital firm</span>, working on the platform and your goals.
                </p>
              )}
            </div>
            <Link
              href="/become-developer"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/10 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:border-indigo-500/70 hover:bg-indigo-600/20"
            >
              🚀 Sell your agent — earn up to 90%
            </Link>
          </div>

          {/* Search + sort */}
          <MarketplaceSearch currentQ={q} currentSort={sort} sortOptions={SORT_OPTIONS} />

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((c) => {
              const isActive = (!cat && c.slug === "all") || cat === c.slug;
              return (
                <Link
                  key={c.slug}
                  href={c.slug === "all"
                    ? `/marketplace${q ? `?q=${encodeURIComponent(q)}` : ""}${sort !== "popular" ? `${q ? "&" : "?"}sort=${sort}` : ""}`
                    : `/marketplace?cat=${c.slug}${sort !== "popular" ? `&sort=${sort}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`
                  }
                  className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                    isActive
                      ? "border-indigo-500/60 bg-indigo-600/20 text-indigo-300"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                </Link>
              );
            })}
          </div>
          {/* KOLOS-1 HQ tag shortcut */}
          <div className="pt-1">
            <Link
              href="/marketplace?tag=kolos1-hq"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-300 hover:border-amber-400 hover:bg-amber-500/20 transition"
            >
              🧠 KOLOS-1 HQ agents
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">

        {/* ── Featured agents (only on default view) ── */}
        {showFeatured && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-1 w-6 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500" />
              <h2 className="text-sm font-semibold text-slate-200">Featured this week</h2>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-medium text-indigo-400">
                CURATED
              </span>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {featured.map((agent) => (
                <FeaturedAgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </section>
        )}

        {/* ── Trending this week ── */}
        {showTrending && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-1 w-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
              <h2 className="text-sm font-semibold text-slate-200">Trending this week</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trendingAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent as Parameters<typeof AgentCard>[0]["agent"]} saved={savedIds.has(agent.id)} isLoggedIn={!!user} />
              ))}
            </div>
          </section>
        )}

        {/* ── Collections ── */}
        {showCollections && collections.map((col) => {
          const list = collectionAgentsMap.get(col.id) ?? [];
          if (list.length === 0) return null;
          return (
            <section key={col.id} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-1 w-6 rounded-full bg-slate-600" />
                <h2 className="text-sm font-semibold text-slate-200">{col.name}</h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((agent) => (
                  <AgentCard key={agent.id} agent={agent as Parameters<typeof AgentCard>[0]["agent"]} saved={savedIds.has(agent.id)} isLoggedIn={!!user} />
                ))}
              </div>
            </section>
          );
        })}

        {/* ── All agents ── */}
        <section className="space-y-4">
          {!showFeatured && (
            <div className="flex items-center gap-2">
              <span className="h-1 w-6 rounded-full bg-slate-700" />
              <h2 className="text-sm font-semibold text-slate-200">
                {q ? `Results for "${q}"` : cat ? `${CATEGORIES.find(c => c.slug === cat)?.icon} ${CATEGORIES.find(c => c.slug === cat)?.name}` : "All agents"}
              </h2>
            </div>
          )}

          <p className="text-xs text-slate-600">
            {totalCount ?? agents.length} agent{(totalCount ?? agents.length) !== 1 ? "s" : ""} found
            {totalPages > 1 && ` — page ${page} of ${totalPages}`}
          </p>

          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-slate-400 text-lg">No agents found</p>
              <p className="text-slate-500 text-sm mt-1 max-w-sm">
                {q ? `No results for "${q}". Try a different search or ` : "New agents are added often. "}
                <Link href="/become-developer" className="text-indigo-400 hover:underline">
                  publish your own →
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent as Parameters<typeof AgentCard>[0]["agent"]} saved={savedIds.has(agent.id)} isLoggedIn={!!user} />
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {page > 1 && (
                <Link
                  href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(cat ? { cat } : {}), ...(sort !== "popular" ? { sort } : {}), page: String(page - 1) }).toString()}`}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition"
                >
                  ← Prev
                </Link>
              )}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <Link
                    key={p}
                    href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(cat ? { cat } : {}), ...(sort !== "popular" ? { sort } : {}), page: String(p) }).toString()}`}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${p === page ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
                  >
                    {p}
                  </Link>
                );
              })}
              {page < totalPages && (
                <Link
                  href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(cat ? { cat } : {}), ...(sort !== "popular" ? { sort } : {}), page: String(page + 1) }).toString()}`}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition"
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </section>

        {/* ── Developer CTA banner ── */}
        <section className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 via-slate-900/60 to-slate-900/60 p-8 text-center space-y-4">
          <p className="text-2xl font-bold text-white">
            Built an AI agent? Sell it here.
          </p>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Thousands of clients are looking for agents just like yours. Publish in minutes, earn 70–90% of every task.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/become-developer"
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
            >
              🚀 Start selling
            </Link>
            <Link href="/leaderboard" className="text-sm text-slate-400 hover:text-slate-200 transition">
              See top earners →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeaturedAgentCard({ agent }: {
  agent: {
    id: string; name: string; slug: string; description: string;
    price_per_task: number; total_tasks_completed: number;
    avg_rating: number | null; review_count: number; tags: string[];
  }
}) {
  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="group relative rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-slate-900/60 p-5 shadow-xl shadow-indigo-500/10 transition hover:border-indigo-500/60 hover:shadow-indigo-500/20 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.12),_transparent_60%)]" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-slate-700 text-xl">🤖</div>
          {agent.avg_rating && (
            <span className="text-sm font-semibold text-yellow-400">★ {Number(agent.avg_rating).toFixed(1)}</span>
          )}
        </div>
        <h3 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition">{agent.name}</h3>
        <p className="mt-1 text-xs text-slate-400 line-clamp-2">{agent.description}</p>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-slate-500">{(agent.total_tasks_completed ?? 0).toLocaleString()} tasks</span>
          <span className="rounded-full bg-indigo-900/60 border border-indigo-700/50 px-2.5 py-1 font-semibold text-indigo-300">
            ⚡ {agent.price_per_task} cr
          </span>
        </div>
      </div>
    </Link>
  );
}

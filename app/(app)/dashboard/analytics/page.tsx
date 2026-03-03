import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { redirect }       from "next/navigation";
import Link               from "next/link";
import DevLevelBadge      from "@/components/DevLevelBadge";

export const dynamic  = "force-dynamic";
export const metadata = { title: "Analytics — Genesis Node" };

// ── Formatting helpers ───────────────────────────────────────────────────────
function fmtCredits(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function fmtDollars(credits: number) {
  return `$${(credits / 100).toFixed(2)}`;
}

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/analytics");

  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("role, total_earned_credits, total_paid_out_credits, dev_level, current_streak, balance")
    .eq("id", user.id)
    .single();

  if ((profile as { role?: string } | null)?.role !== "dev") {
    redirect("/dashboard?error=dev_only");
  }

  // Daily revenue last 30 days
  const { data: dailyRaw } = await service
    .from("developer_daily_revenue")
    .select("day, credits_earned, transactions")
    .eq("developer_id", user.id)
    .order("day", { ascending: true })
    .limit(30);

  // Per-agent analytics
  const { data: agentStats } = await service
    .from("agent_analytics")
    .select("agent_id, name, slug, price_per_task, total_tasks_completed, total_earnings_credits, avg_rating, review_count, tasks_last_7d, tasks_last_30d, unique_clients, completion_rate_pct, avg_duration_seconds")
    .eq("creator_id", user.id);

  // Build 30-day scaffold
  const today = new Date();
  const days30: { day: string; label: string; credits: number; txns: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = (dailyRaw ?? []).find((r: { day: string }) => r.day === key);
    days30.push({
      day:     key,
      label:   d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      credits: found ? Number((found as { credits_earned: number }).credits_earned) : 0,
      txns:    found ? Number((found as { transactions: number }).transactions)     : 0,
    });
  }

  const totalLast30  = days30.reduce((s, d) => s + d.credits, 0);
  const totalLast7   = days30.slice(-7).reduce((s, d) => s + d.credits, 0);
  const prevWeek     = days30.slice(-14, -7).reduce((s, d) => s + d.credits, 0);
  const weekChange   = prevWeek === 0 ? null : Math.round(((totalLast7 - prevWeek) / prevWeek) * 100);
  const maxCredits   = Math.max(...days30.map((d) => d.credits), 1);

  const p = profile as {
    total_earned_credits: number; total_paid_out_credits: number;
    dev_level: string; current_streak: number; balance: number;
  };

  const stats = agentStats ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Developer Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">Your earnings, agent performance, and growth</p>
        </div>
        <div className="flex items-center gap-2">
          <DevLevelBadge level={p.dev_level} showShare />
          <Link href="/dashboard"
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition">
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label:   "Last 7 days",
            value:   fmtCredits(totalLast7),
            sub:     fmtDollars(totalLast7),
            change:  weekChange,
            color:   "text-emerald-400",
          },
          {
            label:   "Last 30 days",
            value:   fmtCredits(totalLast30),
            sub:     fmtDollars(totalLast30),
            change:  null,
            color:   "text-sky-400",
          },
          {
            label:   "All time",
            value:   fmtCredits(p.total_earned_credits),
            sub:     fmtDollars(p.total_earned_credits),
            change:  null,
            color:   "text-indigo-400",
          },
          {
            label:   "Balance",
            value:   fmtCredits(p.balance),
            sub:     fmtDollars(p.balance),
            change:  null,
            color:   "text-yellow-400",
          },
        ].map(({ label, value, sub, change, color }) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500">{sub}</p>
              {change !== null && (
                <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                  change >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {change >= 0 ? "+" : ""}{change}% vs prev week
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Revenue chart ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Daily revenue — last 30 days</h2>
        {totalLast30 === 0 ? (
          <div className="flex h-40 items-center justify-center text-slate-600 text-sm">
            No earnings yet — deploy your agents to start earning
          </div>
        ) : (
          <div className="space-y-1">
            {/* Bar chart */}
            <div className="flex h-40 items-end gap-[2px]">
              {days30.map((d) => {
                const heightPct = maxCredits > 0 ? Math.round((d.credits / maxCredits) * 100) : 0;
                return (
                  <div
                    key={d.day}
                    title={`${d.label}: ⚡ ${d.credits} (${d.txns} txns)`}
                    className="group relative flex-1 min-w-0 cursor-default"
                    style={{ height: "100%" }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-sm bg-gradient-to-t from-indigo-600/80 to-sky-500/80 transition-all group-hover:from-indigo-500 group-hover:to-sky-400"
                      style={{ height: `${Math.max(heightPct, d.credits > 0 ? 2 : 0)}%` }}
                    />
                    {/* Tooltip */}
                    {d.credits > 0 && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex rounded bg-slate-800 border border-slate-700 px-2 py-1 text-[10px] text-slate-200 whitespace-nowrap z-10">
                        {d.label}: ⚡{d.credits}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* X axis labels (every 5th) */}
            <div className="flex gap-[2px]">
              {days30.map((d, i) => (
                <div key={d.day} className="flex-1 min-w-0 text-center text-[8px] text-slate-700 overflow-hidden">
                  {i % 5 === 0 ? d.label.split(" ")[0] : ""}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Per-agent table ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Agent performance</h2>

        {stats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center space-y-3">
            <p className="text-slate-500">You haven&apos;t published any agents yet.</p>
            <Link href="/agents/new"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition">
              + Register your first agent
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  {["Agent", "Tasks (7d)", "Tasks (30d)", "Clients", "Compl. %", "Avg time", "Rating", "Earned"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((a: {
                  agent_id: string; name: string; slug: string;
                  tasks_last_7d: number; tasks_last_30d: number;
                  unique_clients: number; completion_rate_pct: number | null;
                  avg_duration_seconds: number; avg_rating: number | null;
                  review_count: number; total_earnings_credits: number;
                }) => (
                  <tr key={a.agent_id} className="border-b border-slate-800/60 hover:bg-slate-900/40 transition">
                    <td className="px-4 py-3">
                      <Link href={`/agents/${a.slug}`} className="font-medium text-slate-200 hover:text-indigo-400 transition">
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{a.tasks_last_7d ?? 0}</td>
                    <td className="px-4 py-3 text-slate-300">{a.tasks_last_30d ?? 0}</td>
                    <td className="px-4 py-3 text-slate-300">{a.unique_clients ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${
                        !a.completion_rate_pct ? "text-slate-600" :
                        a.completion_rate_pct >= 90 ? "text-emerald-400" :
                        a.completion_rate_pct >= 70 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {a.completion_rate_pct != null ? `${a.completion_rate_pct}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {a.avg_duration_seconds ? `${Math.round(a.avg_duration_seconds)}s` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {a.avg_rating ? (
                        <span className="text-yellow-400">★ {Number(a.avg_rating).toFixed(1)}</span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      ⚡ {fmtCredits(a.total_earnings_credits ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Links ── */}
      <div className="flex flex-wrap gap-3">
        <Link href="/pipelines/new"
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/10 px-4 py-2 text-xs font-semibold text-indigo-300 hover:border-indigo-500/60 transition">
          🔗 Create pipeline
        </Link>
        <Link href="/leaderboard"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition">
          🏆 Leaderboard
        </Link>
        <Link href="/become-developer"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition">
          📈 Level guide
        </Link>
      </div>
    </main>
  );
}

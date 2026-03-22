import { createServiceClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const secret = process.env.ADMIN_SECRET;
  if (!secret || key !== secret) notFound();

  const service = createServiceClient();

  const [
    { count: totalTasks },
    { count: totalUsers },
    { count: totalAgents },
    { data: completedTasks },
    { data: topAgents },
    { data: economySummary },
    { data: payoutsSummary },
    matadoraStatsRaw,
    { data: forecastArr },
    { data: monthlyRevenue },
  ] = await Promise.all([
    service.from("tasks").select("id", { count: "exact", head: true }),
    service.from("profiles").select("id", { count: "exact", head: true }),
    service.from("agents").select("id", { count: "exact", head: true }).eq("is_active", true),
    service.from("tasks").select("client_id").eq("status", "completed"),
    service
      .from("agents")
      .select("id, name, slug, total_tasks_completed")
      .eq("is_active", true)
      .order("total_tasks_completed", { ascending: false })
      .limit(10),
    service.from("platform_economy_summary").select("*").single(),
    service.from("platform_payouts_summary").select("*").single(),
    service.rpc("get_matadora_stats"),
    service.from("forecast_simple_arr").select("*").maybeSingle(),
    service.from("monthly_revenue_credits").select("*").order("month", { ascending: false }).limit(6),
  ]);

  const uniqueClientsWhoCompleted = new Set((completedTasks ?? []).map((t: { client_id: string }) => t.client_id)).size;
  const conversionHint = totalUsers ? ((uniqueClientsWhoCompleted / totalUsers) * 100).toFixed(1) : "—";

  const economy = (economySummary ?? {}) as {
    total_credits_purchased?: number;
    total_credits_spent_on_tasks?: number;
    total_credits_refunded?: number;
    total_bonus_credits?: number;
  };

  const payouts = (payoutsSummary ?? {}) as {
    pending_payout_credits?: number;
    pending_payout_usd?: number;
    paid_payout_credits?: number;
    paid_payout_usd?: number;
  };

  type MatadoraStats = { total_earned: number; total_wallets: number; avg_balance: number };
  const matadoraRows = (matadoraStatsRaw?.data ?? []) as MatadoraStats[] | MatadoraStats | null;
  const matadora =
    (Array.isArray(matadoraRows) ? matadoraRows[0] : matadoraRows) ?? ({ total_earned: 0, total_wallets: 0, avg_balance: 0 } as MatadoraStats);

  const forecast = (forecastArr ?? {}) as {
    months_observed?: number;
    avg_credits_per_month?: number;
    avg_mrr_usd?: number;
    projected_arr_usd?: number;
    credits_slope_per_month?: number;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Platform stats</h1>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition">
            ← Home
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tasks total</p>
            <p className="mt-1 text-2xl font-bold text-white">{(totalTasks ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Users</p>
            <p className="mt-1 text-2xl font-bold text-white">{(totalUsers ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active agents</p>
            <p className="mt-1 text-2xl font-bold text-white">{(totalAgents ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Users with ≥1 task</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {uniqueClientsWhoCompleted.toLocaleString()}
              <span className="ml-1 text-sm font-normal text-slate-500">({conversionHint}% of users)</span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Credits purchased</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {(economy.total_credits_purchased ?? 0).toLocaleString()}
              <span className="ml-1 text-xs text-slate-500">credits</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Credits spent on tasks</p>
            <p className="mt-1 text-2xl font-bold text-indigo-400">
              {(economy.total_credits_spent_on_tasks ?? 0).toLocaleString()}
              <span className="ml-1 text-xs text-slate-500">credits</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending dev payouts</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">
              ${(payouts.pending_payout_usd ?? 0).toFixed(2)}
              <span className="ml-1 text-xs text-slate-500">USD</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">MATADORA total earned</p>
            <p className="mt-1 text-2xl font-bold text-rose-400">
              {(matadora.total_earned ?? 0).toLocaleString()}
              <span className="ml-1 text-xs text-slate-500">MAT</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Top agents by runs</h2>
          <ul className="space-y-2">
            {(topAgents ?? []).map((a: { id: string; name: string; slug: string; total_tasks_completed: number }, i: number) => (
              <li key={a.id} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-400 w-6">{i + 1}.</span>
                <Link href={`/agents/${a.slug}`} className="text-slate-200 hover:text-indigo-400 transition flex-1 truncate">
                  {a.name}
                </Link>
                <span className="text-indigo-400 font-medium shrink-0">{a.total_tasks_completed} runs</span>
              </li>
            ))}
          </ul>
        </div>

        {forecast && forecast.months_observed ? (
          <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Forecast</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Months observed</p>
                <p className="mt-1 text-xl font-bold text-slate-100">{forecast.months_observed}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg MRR (USD)</p>
                <p className="mt-1 text-xl font-bold text-emerald-400">${(forecast.avg_mrr_usd ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Projected ARR (USD)</p>
                <p className="mt-1 text-xl font-bold text-indigo-400">${(forecast.projected_arr_usd ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Trend (credits / month)</p>
                <p className="mt-1 text-xl font-bold text-amber-400">
                  {(forecast.credits_slope_per_month ?? 0).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

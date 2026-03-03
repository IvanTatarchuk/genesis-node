import { createServiceClient } from "@/lib/supabase-server";
import Link from "next/link";

export const revalidate = 300;

export const metadata = {
  title: "Leaderboard — Genesis Node",
  description: "Top agents and developers with weekly cash prizes on Genesis Node.",
};

// Prize config (mirrors DB prize_tiers)
const AGENT_PRIZES: Record<number, { medal: string; credits: number; fee: number; color: string; glow: string }> = {
  1:  { medal: "🥇", credits: 5000,  fee: 30, color: "text-yellow-400",  glow: "shadow-yellow-500/20 border-yellow-700/50 bg-yellow-950/20" },
  2:  { medal: "🥈", credits: 2500,  fee: 15, color: "text-slate-300",   glow: "shadow-slate-400/10 border-slate-600/50 bg-slate-800/30" },
  3:  { medal: "🥉", credits: 1000,  fee: 10, color: "text-orange-400",  glow: "shadow-orange-500/10 border-orange-800/50 bg-orange-950/20" },
  4:  { medal: "4️⃣",  credits: 500,   fee: 0,  color: "text-slate-400",   glow: "" },
  5:  { medal: "5️⃣",  credits: 500,   fee: 0,  color: "text-slate-400",   glow: "" },
  6:  { medal: "6️⃣",  credits: 250,   fee: 0,  color: "text-slate-500",   glow: "" },
  7:  { medal: "7️⃣",  credits: 250,   fee: 0,  color: "text-slate-500",   glow: "" },
  8:  { medal: "8️⃣",  credits: 100,   fee: 0,  color: "text-slate-600",   glow: "" },
  9:  { medal: "9️⃣",  credits: 100,   fee: 0,  color: "text-slate-600",   glow: "" },
  10: { medal: "🔟",  credits: 100,   fee: 0,  color: "text-slate-600",   glow: "" },
};

const DEV_PRIZES: Record<number, { medal: string; credits: number; usd: string; color: string; glow: string }> = {
  1:  { medal: "🥇", credits: 10000, usd: "$100", color: "text-yellow-400", glow: "shadow-yellow-500/20 border-yellow-700/50 bg-yellow-950/20" },
  2:  { medal: "🥈", credits: 5000,  usd: "$50",  color: "text-slate-300",  glow: "shadow-slate-400/10 border-slate-600/50 bg-slate-800/30" },
  3:  { medal: "🥉", credits: 2500,  usd: "$25",  color: "text-orange-400", glow: "shadow-orange-500/10 border-orange-800/50 bg-orange-950/20" },
  4:  { medal: "4️⃣",  credits: 1000,  usd: "$10",  color: "text-slate-400",  glow: "" },
  5:  { medal: "5️⃣",  credits: 1000,  usd: "$10",  color: "text-slate-400",  glow: "" },
  6:  { medal: "6️⃣",  credits: 500,   usd: "$5",   color: "text-slate-500",  glow: "" },
  7:  { medal: "7️⃣",  credits: 500,   usd: "$5",   color: "text-slate-500",  glow: "" },
  8:  { medal: "8️⃣",  credits: 250,   usd: "$2.50",color: "text-slate-600",  glow: "" },
  9:  { medal: "9️⃣",  credits: 250,   usd: "$2.50",color: "text-slate-600",  glow: "" },
  10: { medal: "🔟",  credits: 250,   usd: "$2.50",color: "text-slate-600",  glow: "" },
};

function getNextMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilMonday);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function getWeekLabel(): string {
  const now = new Date();
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getUTCDay() + 1) / 7);
  return `Week ${weekNum}, ${now.getUTCFullYear()}`;
}

export default async function LeaderboardPage() {
  const supabase = createServiceClient();

  const [{ data: topAgents }, { data: topDevs }, { data: lastRewards }] = await Promise.all([
    supabase
      .from("agents")
      .select("id, name, slug, description, total_tasks_completed, avg_rating, review_count, price_per_task, tags, fee_reduction_pct, fee_reduction_ends")
      .eq("is_active", true)
      .order("total_tasks_completed", { ascending: false })
      .limit(10),

    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, total_earned_credits, current_streak")
      .eq("role", "dev")
      .order("total_earned_credits", { ascending: false })
      .limit(10),

    supabase
      .from("leaderboard_rewards")
      .select("category, rank, winner_name, score, credits_awarded, period_label")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const nextReset = getNextMonday();
  const weekLabel = getWeekLabel();
  const lastPeriod = lastRewards?.[0]?.period_label ?? null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-grid-dark opacity-20" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(234,179,8,0.12),_transparent_50%)]" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12">

        {/* ── Header ── */}
        <div className="mb-12 text-center space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-300">
            🏆 {weekLabel} — Prizes reset every Monday
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Weekly{" "}
            <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              Leaderboard
            </span>
          </h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Top agents and developers win real credits every week.
            Next distribution in <Countdown target={nextReset} />.
          </p>

          {/* Total prizes this week */}
          <div className="inline-flex items-center gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-3 text-sm">
            <div className="text-center">
              <p className="text-xl font-bold text-yellow-400">⚡ 37,500</p>
              <p className="text-[11px] text-slate-500">credits in prizes</p>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-400">$375</p>
              <p className="text-[11px] text-slate-500">total prize pool</p>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-indigo-400">20</p>
              <p className="text-[11px] text-slate-500">winners / week</p>
            </div>
          </div>
        </div>

        {/* ── Prize tables (top 3) ── */}
        <div className="grid gap-6 mb-10 sm:grid-cols-3">
          {[1, 2, 3].map((rank) => {
            const ap = AGENT_PRIZES[rank];
            const dp = DEV_PRIZES[rank];
            return (
              <div
                key={rank}
                className={`rounded-2xl border p-5 space-y-3 shadow-xl ${rank === 1 ? ap.glow : ap.glow || "border-slate-800 bg-slate-900/60"}`}
              >
                <div className="text-center">
                  <p className="text-4xl">{ap.medal}</p>
                  <p className={`mt-1 text-lg font-bold ${ap.color}`}>#{rank} Place</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">🤖 Best Agent</p>
                    <p className="text-emerald-400 font-bold">⚡ {ap.credits.toLocaleString()} credits</p>
                    {ap.fee > 0 && (
                      <p className="text-indigo-400 mt-0.5">+ {ap.fee}% fee reduction (7 days)</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">👨‍💻 Best Developer</p>
                    <p className="text-emerald-400 font-bold">⚡ {dp.credits.toLocaleString()} credits</p>
                    <p className="text-slate-400 mt-0.5">= {dp.usd} USD value</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Leaderboards ── */}
        <div className="grid gap-10 lg:grid-cols-2">

          {/* Top Agents */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                🤖 Top Agents
                <span className="text-[10px] text-slate-500 font-normal">by tasks this week</span>
              </h2>
              <Link href="/marketplace" className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                All agents →
              </Link>
            </div>
            <div className="space-y-2">
              {(topAgents ?? []).map((agent, i) => {
                const rank = i + 1;
                const prize = AGENT_PRIZES[rank];
                const hasFeeReduction = (agent.fee_reduction_pct ?? 0) > 0;
                return (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.slug}`}
                    className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 transition hover:bg-slate-900 ${rank <= 3 ? prize.glow || "" : "border-slate-800/80 bg-slate-900/60 hover:border-indigo-500/30"}`}
                  >
                    {/* Medal */}
                    <div className="shrink-0 w-9 text-center">
                      <span className={`text-xl ${rank > 3 ? "opacity-50" : ""}`}>{prize.medal}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-100 group-hover:text-indigo-300 transition text-sm truncate">
                          {agent.name}
                        </p>
                        {hasFeeReduction && (
                          <span className="shrink-0 rounded-full bg-indigo-900/60 border border-indigo-700/50 px-1.5 py-0.5 text-[9px] text-indigo-300">
                            -{agent.fee_reduction_pct}% fee
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                        {agent.avg_rating && <span className="text-yellow-400">★ {Number(agent.avg_rating).toFixed(1)}</span>}
                        <span>{(agent.total_tasks_completed ?? 0).toLocaleString()} total tasks</span>
                      </div>
                    </div>

                    {/* Prize */}
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-bold ${prize.color}`}>
                        ⚡ {prize.credits.toLocaleString()}
                      </p>
                      {prize.fee > 0 && (
                        <p className="text-[9px] text-indigo-400 mt-0.5">-{prize.fee}% fee</p>
                      )}
                    </div>
                  </Link>
                );
              })}
              {(!topAgents || topAgents.length === 0) && (
                <EmptyState label="No agents yet" cta="Register an agent" href="/agents/new" />
              )}
            </div>
          </section>

          {/* Top Developers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                👨‍💻 Top Developers
                <span className="text-[10px] text-slate-500 font-normal">by earnings this week</span>
              </h2>
              <Link href="/leaderboard/history" className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                Prize history →
              </Link>
            </div>
            <div className="space-y-2">
              {(topDevs ?? []).map((dev, i) => {
                const rank = i + 1;
                const prize = DEV_PRIZES[rank];
                return (
                  <Link
                    key={dev.id}
                    href={`/dev/${dev.id}`}
                    className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 transition hover:bg-slate-900 ${rank <= 3 ? prize.glow || "" : "border-slate-800/80 bg-slate-900/60 hover:border-emerald-500/30"}`}
                  >
                    {/* Medal */}
                    <div className="shrink-0 w-9 text-center">
                      <span className={`text-xl ${rank > 3 ? "opacity-50" : ""}`}>{prize.medal}</span>
                    </div>

                    {/* Avatar + name */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-sky-600 text-xs font-bold text-white ring-1 ring-slate-700">
                        {dev.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={dev.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          dev.display_name?.[0]?.toUpperCase() ?? "?"
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-100 group-hover:text-emerald-300 transition text-sm truncate">
                          {dev.display_name ?? "Anonymous"}
                        </p>
                        <div className="flex gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>${((dev.total_earned_credits ?? 0) / 100).toFixed(0)} total earned</span>
                          {(dev.current_streak ?? 0) > 0 && (
                            <span className="text-orange-400">🔥 {dev.current_streak}d</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Prize */}
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-bold ${prize.color}`}>
                        ⚡ {prize.credits.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-emerald-400 mt-0.5">{prize.usd}</p>
                    </div>
                  </Link>
                );
              })}
              {(!topDevs || topDevs.length === 0) && (
                <EmptyState label="No developers yet" cta="Register your agent" href="/agents/new" />
              )}
            </div>
          </section>
        </div>

        {/* ── Last week's winners ── */}
        {lastRewards && lastRewards.length > 0 && (
          <section className="mt-14 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">
                Last week&apos;s winners
                <span className="ml-2 text-[10px] text-slate-500 font-normal">({lastPeriod})</span>
              </h2>
              <Link href="/leaderboard/history" className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                Full history →
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {lastRewards.slice(0, 6).map((r) => {
                const prizes = r.category === "agent" ? AGENT_PRIZES : DEV_PRIZES;
                const prize = prizes[r.rank as keyof typeof prizes];
                return (
                  <div
                    key={`${r.category}-${r.rank}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5"
                  >
                    <span className="text-lg shrink-0">{prize?.medal ?? `#${r.rank}`}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">{r.winner_name}</p>
                      <p className="text-[10px] text-slate-600 capitalize">{r.category}</p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${prize?.color ?? "text-slate-400"}`}>
                      ⚡ {r.credits_awarded.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── How it works ── */}
        <section className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
          <h3 className="text-center text-base font-semibold text-slate-100 mb-8">How prizes work</h3>
          <div className="grid gap-6 sm:grid-cols-3 text-sm text-slate-400">
            <div className="space-y-2 text-center">
              <div className="text-3xl">📅</div>
              <p className="font-medium text-slate-200">Weekly reset</p>
              <p>Rankings and prizes reset every Monday at 00:00 UTC. Fresh start, new chances.</p>
            </div>
            <div className="space-y-2 text-center">
              <div className="text-3xl">⚡</div>
              <p className="font-medium text-slate-200">Instant credits</p>
              <p>Prizes are real credits added to your balance automatically — no claiming needed.</p>
            </div>
            <div className="space-y-2 text-center">
              <div className="text-3xl">📉</div>
              <p className="font-medium text-slate-200">Fee reductions</p>
              <p>Top-3 agents earn reduced platform fees (0–10%) for the following 7 days.</p>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-slate-400 text-sm">Want to win next week?</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/agents/new" className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-yellow-500/30 transition hover:brightness-110">
              🤖 Register an agent
            </Link>
            <Link href="/marketplace" className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-700">
              Deploy tasks to compete
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function EmptyState({ label, cta, href }: { label: string; cta: string; href: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
      <p className="text-slate-500 text-sm">{label}.</p>
      <Link href={href} className="mt-2 inline-flex text-xs text-indigo-400 hover:text-indigo-300 transition">
        {cta} →
      </Link>
    </div>
  );
}

// Server-side countdown display (shows time until next Monday)
function Countdown({ target }: { target: Date }) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return <span className="font-semibold text-yellow-400">{days}d {hours}h</span>;
  if (hours > 0) return <span className="font-semibold text-orange-400">{hours}h {mins}m</span>;
  return <span className="font-semibold text-red-400">{mins}m</span>;
}

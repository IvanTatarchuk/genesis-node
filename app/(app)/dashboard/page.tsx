import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Profile, Task, Agent } from "@/lib/database.types";
import {
  BoltIcon,
  PlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
  LoaderIcon,
  ArrowRightIcon,
} from "lucide-react";
import BuyCreditsButton from "@/components/BuyCreditsButton";
import RoleSwitcher from "@/components/RoleSwitcher";
import ReferralCard from "@/components/ReferralCard";
import StreakBadge from "@/components/StreakBadge";

const STATUS_STYLE: Record<Task["status"], string> = {
  pending:   "text-slate-400  bg-slate-800/60  border-slate-700/60",
  running:   "text-sky-400    bg-sky-900/20    border-sky-800/60",
  completed: "text-emerald-400 bg-emerald-900/20 border-emerald-800/60",
  failed:    "text-red-400    bg-red-900/20    border-red-800/60",
  cancelled: "text-slate-500  bg-slate-900/60  border-slate-800",
};

const STATUS_ICON: Record<Task["status"], React.ReactNode> = {
  pending:   <ClockIcon className="h-3 w-3" />,
  running:   <LoaderIcon className="h-3 w-3 animate-spin" />,
  completed: <CheckCircle2Icon className="h-3 w-3" />,
  failed:    <XCircleIcon className="h-3 w-3" />,
  cancelled: <XCircleIcon className="h-3 w-3" />,
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileRes, tasksRes, agentsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("tasks")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("agents")
      .select("id, name, slug, price_per_task, total_tasks_completed, total_earnings_credits, pending_payout_credits, is_active")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileRes.data as unknown as Profile;
  const tasks   = (tasksRes.data   ?? []) as unknown as Task[];
  const agents  = (agentsRes.data  ?? []) as unknown as Agent[];

  // Earnings totals (only for devs)
  const totalEarnedCredits  = (profile as unknown as { total_earned_credits?: number })?.total_earned_credits ?? 0;
  const totalPaidOut        = (profile as unknown as { total_paid_out_credits?: number })?.total_paid_out_credits ?? 0;
  const pendingEarnings     = totalEarnedCredits - totalPaidOut;

  // Referral + streak
  const referralCode    = (profile as unknown as { referral_code?: string })?.referral_code ?? "";
  const referralCount   = (profile as unknown as { referral_count?: number })?.referral_count ?? 0;
  const referralEarned  = (profile as unknown as { referral_earned?: number })?.referral_earned ?? 0;
  const currentStreak   = (profile as unknown as { current_streak?: number })?.current_streak ?? 0;
  const longestStreak   = (profile as unknown as { longest_streak?: number })?.longest_streak ?? 0;

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const runningCount   = tasks.filter((t) => t.status === "running").length;
  const totalSpent     = tasks.reduce((sum, t) => sum + t.credits_charged, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Welcome back{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {profile?.role === "dev" ? "Developer account" : "Client account"} ·{" "}
            <RoleSwitcher currentRole={profile?.role ?? "client"} />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BuyCreditsButton />
          <Link
            href="/marketplace"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-md shadow-indigo-500/30 transition hover:brightness-110"
          >
            <PlusIcon className="h-4 w-4" />
            Deploy agent
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Credits balance" value={`⚡ ${profile?.balance?.toLocaleString() ?? 0}`} sub="available" color="indigo" />
        <StatCard label="Tasks completed" value={completedCount.toString()}    sub="all time"     color="emerald" />
        <StatCard label="Currently running" value={runningCount.toString()}     sub="live agents"  color="sky" />
        <StatCard label="Credits spent"    value={totalSpent.toLocaleString()} sub="total"        color="slate" />
      </div>

      {/* Developer earnings — only for devs */}
      {profile?.role === "dev" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Earnings</h2>
            <span className="text-xs text-slate-500">70% revenue share</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total earned"
              value={`$${(totalEarnedCredits / 100).toFixed(2)}`}
              sub={`${totalEarnedCredits.toLocaleString()} credits`}
              color="emerald"
            />
            <StatCard
              label="Pending payout"
              value={`$${(pendingEarnings / 100).toFixed(2)}`}
              sub="paid weekly"
              color="indigo"
            />
            <StatCard
              label="Paid out"
              value={`$${(totalPaidOut / 100).toFixed(2)}`}
              sub="all time"
              color="slate"
            />
          </div>
          {pendingEarnings > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-3">
              <span className="text-emerald-400 text-lg">💰</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-300">
                  ${(pendingEarnings / 100).toFixed(2)} waiting for payout
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Payouts are processed weekly. Make sure your Stripe Connect account is set up.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Developer agents section — only shown for devs */}
      {profile?.role === "dev" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">My Agents</h2>
            <Link href="/agents/new" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition">
              <PlusIcon className="h-3.5 w-3.5" /> Register new
            </Link>
          </div>
          {agents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center">
              <p className="text-sm text-slate-500">No agents yet.</p>
              <Link href="/agents/new" className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition">
                Register your first agent <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-100 text-sm">{agent.name}</p>
                    <span className={`text-[10px] rounded-full px-2 py-0.5 border ${agent.is_active ? "text-emerald-400 border-emerald-800/60 bg-emerald-900/20" : "text-slate-500 border-slate-800 bg-slate-900"}`}>
                      {agent.is_active ? "active" : "inactive"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{agent.total_tasks_completed} tasks</span>
                    <span className="flex items-center gap-0.5 text-indigo-400">
                      <BoltIcon className="h-3 w-3" />
                      {agent.price_per_task} cr/task
                    </span>
                  </div>
                  {((agent as unknown as { total_earnings_credits?: number }).total_earnings_credits ?? 0) > 0 && (
                    <p className="text-[11px] text-emerald-400 font-medium">
                      💰 ${(((agent as unknown as { total_earnings_credits?: number }).total_earnings_credits ?? 0) / 100).toFixed(2)} earned
                    </p>
                  )}
                  <Link
                    href={`/agents/${agent.slug}/edit`}
                    className="mt-1 text-center text-xs text-slate-500 hover:text-slate-300 transition"
                  >
                    Edit →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Referral + Streak sidebar section */}
      <div className="grid gap-4 md:grid-cols-2">
        {referralCode && (
          <ReferralCard
            referralCode={referralCode}
            referralCount={referralCount}
            referralEarned={referralEarned}
          />
        )}
        <StreakBadge currentStreak={currentStreak} longestStreak={longestStreak} />
      </div>

      {/* Recent tasks */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Recent Tasks</h2>
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center">
            <p className="text-sm text-slate-500">No tasks yet.</p>
            <Link href="/marketplace" className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition">
              Browse agents <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 transition hover:border-slate-700 hover:bg-slate-900 group"
              >
                <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium shrink-0 ${STATUS_STYLE[task.status]}`}>
                  {STATUS_ICON[task.status]}
                  {task.status}
                </span>
                <p className="flex-1 truncate text-sm text-slate-300 group-hover:text-slate-100 transition">
                  {task.goal}
                </p>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] text-slate-500">
                    {new Date(task.created_at).toLocaleDateString()}
                  </p>
                  {task.credits_charged > 0 && (
                    <p className="text-[11px] text-indigo-400">
                      ⚡ {task.credits_charged}
                    </p>
                  )}
                </div>
                <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-slate-400 transition" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label, value, sub, color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "indigo" | "emerald" | "sky" | "slate";
}) {
  const glows: Record<string, string> = {
    indigo:  "from-indigo-500/10",
    emerald: "from-emerald-500/10",
    sky:     "from-sky-500/10",
    slate:   "from-slate-500/10",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br ${glows[color]} to-transparent p-5`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-600">{sub}</p>
    </div>
  );
}

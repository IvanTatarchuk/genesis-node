import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { CpuChipIcon, SparklesIcon, ShieldCheckIcon, ChartBarIcon, PaintBrushIcon } from "lucide-react";
import TrinityLive from "@/components/TrinityLive";

export const revalidate = 0;

const AGENT_CONFIG = {
  VASYLIY: {
    icon: ShieldCheckIcon,
    title: "ВАСИЛІЙ",
    subtitle: "The Infrastructure Saint",
    color: "indigo",
    ring: "ring-indigo-500/40",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    dot: "bg-indigo-400",
  },
  HRYHORIY: {
    icon: ChartBarIcon,
    title: "ГРИГОРІЙ",
    subtitle: "The Strategy Saint",
    color: "amber",
    ring: "ring-amber-500/40",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  IOANN: {
    icon: PaintBrushIcon,
    title: "ІОАНН",
    subtitle: "The Interface Saint",
    color: "emerald",
    ring: "ring-emerald-500/40",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
} as const;

export default async function TrinityPage() {
  const sb = await createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  // Only owner can see Trinity dashboard
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  // Anyone can view, but only relevant data shown

  const [stateRes, cyclesRes, reportsRes] = await Promise.all([
    sb.from("trinity_state").select("*"),
    sb.from("trinity_cycles").select("*").order("cycle_number", { ascending: false }).limit(9),
    sb.from("trinity_reports").select("agent, report_type, content, created_at").order("created_at", { ascending: false }).limit(9),
  ]);

  const states = (stateRes.data ?? []) as any[];
  const cycles = (cyclesRes.data ?? []) as any[];
  const reports = (reportsRes.data ?? []) as any[];

  const latestCycle = cycles[0];
  const totalCycles = cycles.length > 0 ? Math.max(...cycles.map((c: any) => c.cycle_number ?? 0)) : 0;

  function getState(agent: string) {
    return states.find((s) => s.agent === agent);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Holy Trinity — Autonomous Mode Active
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">The Holy Trinity</h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Три автономних агенти керують платформою 24/7. Кожні 3 години — новий цикл.
          О 03:00 UTC — особлива нічна сесія.
        </p>
      </div>

      {/* Cycle stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Завершено циклів", value: totalCycles, icon: "🔄" },
          { label: "Останній цикл", value: latestCycle ? `#${latestCycle.cycle_number}` : "—", icon: "⚡" },
          { label: "Тривалість", value: latestCycle?.duration_seconds ? `${latestCycle.duration_seconds}с` : "—", icon: "⏱" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center">
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Agent cards */}
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        {(["VASYLIY", "HRYHORIY", "IOANN"] as const).map((agentKey) => {
          const cfg = AGENT_CONFIG[agentKey];
          const state = getState(agentKey);
          const Icon = cfg.icon;
          const lastReport = reports.find((r) => r.agent === agentKey);

          return (
            <div key={agentKey} className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 ring-1 ${cfg.ring}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-10 w-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 text-${cfg.color}-400`} />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{cfg.title}</div>
                  <div className="text-xs text-slate-500">{cfg.subtitle}</div>
                </div>
                <div className={`ml-auto h-2.5 w-2.5 rounded-full ${state ? cfg.dot : "bg-slate-600"} ${state ? "animate-pulse" : ""}`} />
              </div>

              {state ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Цикли виконано</span>
                    <span className="font-medium text-white">{state.cycle_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Здоров'я</span>
                    <span className="font-medium text-emerald-400">{state.health_score ?? 100}%</span>
                  </div>
                  {state.last_run && (
                    <div className="flex justify-between text-slate-400">
                      <span>Останній запуск</span>
                      <span className="font-medium text-white text-right max-w-[120px] truncate">
                        {new Date(state.last_run).toLocaleTimeString("uk", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Ще не запускався</p>
              )}

              {lastReport && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-[10px] text-slate-500 mb-1">Останній звіт:</p>
                  <p className="text-xs text-slate-400 line-clamp-3">{lastReport.content.slice(0, 200)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent cycles */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Останні цикли</h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500">
                <th className="text-left px-4 py-3">Цикл</th>
                <th className="text-left px-4 py-3">Час</th>
                <th className="text-left px-4 py-3">Тип</th>
                <th className="text-left px-4 py-3">Статус</th>
                <th className="text-left px-4 py-3">Тривалість</th>
              </tr>
            </thead>
            <tbody>
              {cycles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 text-sm">
                    Цикли ще не виконувались. Агенти запустяться при деплої.
                  </td>
                </tr>
              ) : (
                cycles.map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-slate-300">#{c.cycle_number}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(c.started_at).toLocaleString("uk", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      {c.is_night_cycle ? (
                        <span className="text-indigo-400 text-xs font-medium">🌙 Нічний</span>
                      ) : (
                        <span className="text-slate-400 text-xs">Звичайний</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                        c.status === "running" ? "bg-sky-500/10 text-sky-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {c.status === "completed" ? "✅" : c.status === "running" ? "🔄" : "❌"} {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{c.duration_seconds ? `${c.duration_seconds}с` : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live updates component */}
      <TrinityLive />
    </div>
  );
}

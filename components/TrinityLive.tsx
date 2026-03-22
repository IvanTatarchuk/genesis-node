"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type CycleRow = {
  id: string;
  cycle_number: number;
  status: string;
  is_night_cycle: boolean;
  started_at: string;
  duration_seconds: number | null;
};

type StateRow = {
  agent: string;
  cycle_count: number;
  health_score: number;
  last_run: string;
};

export default function TrinityLive() {
  const [latestCycle, setLatestCycle] = useState<CycleRow | null>(null);
  const [states, setStates] = useState<StateRow[]>([]);
  const [nextCycleIn, setNextCycleIn] = useState("");

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function fetchStates() {
    const { data } = await sb.from("trinity_state").select("agent, cycle_count, health_score, last_run");
    setStates((data ?? []) as StateRow[]);
  }

  useEffect(() => {
    const channel = sb
      .channel("trinity-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "trinity_cycles" }, (payload) => {
        setLatestCycle(payload.new as CycleRow);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trinity_state" }, () => {
        fetchStates();
      })
      .subscribe();

    const id = setTimeout(() => fetchStates(), 0);
    return () => {
      clearTimeout(id);
      sb.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sb and fetchStates are stable
  }, []);

  // Countdown to next 3-hour mark
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const nextHour = Math.ceil(now.getUTCHours() / 3) * 3;
      const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), nextHour % 24));
      if (next <= now) next.setUTCHours(next.getUTCHours() + 3);
      const diff = next.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setNextCycleIn(`${h}г ${m}хв ${s}с`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Live моніторинг
        </h2>
        <div className="text-xs text-slate-500">
          Наступний цикл через: <span className="font-mono text-indigo-400">{nextCycleIn || "..."}</span>
        </div>
      </div>

      {latestCycle && (
        <div className={`rounded-xl border p-3 mb-4 text-xs ${
          latestCycle.status === "running"
            ? "border-sky-500/30 bg-sky-500/5 text-sky-300"
            : latestCycle.status === "completed"
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
            : "border-red-500/30 bg-red-500/5 text-red-300"
        }`}>
          {latestCycle.status === "running" ? "🔄" : latestCycle.status === "completed" ? "✅" : "❌"}{" "}
          Цикл #{latestCycle.cycle_number} — {latestCycle.status}
          {latestCycle.is_night_cycle && " 🌙 Нічний"}
          {latestCycle.duration_seconds && ` (${latestCycle.duration_seconds}с)`}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {["VASYLIY", "HRYHORIY", "IOANN"].map((agent) => {
          const state = states.find((s) => s.agent === agent);
          const colors: Record<string, string> = {
            VASYLIY: "text-indigo-400",
            HRYHORIY: "text-amber-400",
            IOANN: "text-emerald-400",
          };
          const names: Record<string, string> = {
            VASYLIY: "Василій",
            HRYHORIY: "Григорій",
            IOANN: "Іоанн",
          };
          return (
            <div key={agent} className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 text-center">
              <div className={`text-xs font-semibold mb-2 ${colors[agent]}`}>{names[agent]}</div>
              <div className="text-lg font-bold text-white">{state?.cycle_count ?? 0}</div>
              <div className="text-[10px] text-slate-500">циклів</div>
              <div className={`text-[10px] mt-1 ${(state?.health_score ?? 0) > 80 ? "text-emerald-400" : "text-amber-400"}`}>
                ❤ {state?.health_score ?? "—"}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

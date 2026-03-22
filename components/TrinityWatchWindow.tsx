"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type AgentKey = "VASYLIY" | "HRYHORIY" | "IOANN";

type LogEntry = {
  id: string;
  ts: Date;
  agent: AgentKey | "SYSTEM";
  type: "memory" | "message" | "report" | "cycle" | "tool" | "think";
  text: string;
};

type AgentState = {
  agent: AgentKey;
  cycle_count: number;
  health_score: number;
  last_action?: string;
  last_run?: string;
};

const AGENT_STYLES: Record<AgentKey | "SYSTEM", { color: string; label: string; icon: string }> = {
  VASYLIY:  { color: "text-indigo-400", label: "ВАСИЛІЙ",  icon: "🔧" },
  HRYHORIY: { color: "text-amber-400",  label: "ГРИГОРІЙ", icon: "📊" },
  IOANN:    { color: "text-emerald-400",label: "ІОАНН",    icon: "🎨" },
  SYSTEM:   { color: "text-slate-400",  label: "SYSTEM",   icon: "⚙️" },
};

const TYPE_PREFIX: Record<LogEntry["type"], string> = {
  memory:  "💾 [MEMORY]",
  message: "💬 [MSG]",
  report:  "📋 [REPORT]",
  cycle:   "🔄 [CYCLE]",
  tool:    "🛠 [TOOL]",
  think:   "🧠 [THINK]",
};

export default function TrinityWatchWindow() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [states, setStates] = useState<AgentState[]>([]);
  const [activeCycle, setActiveCycle] = useState<{ number: number; status: string } | null>(null);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<AgentKey | "ALL">("ALL");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  function addLog(entry: Omit<LogEntry, "id" | "ts">) {
    if (pausedRef.current) return;
    setLogs((prev) => {
      const next = [...prev, { ...entry, id: crypto.randomUUID(), ts: new Date() }];
      return next.slice(-300); // keep last 300 entries
    });
  }

  useEffect(() => {
    // Load recent history
    (async () => {
      const [memRes, msgRes, repRes, cycRes, stRes] = await Promise.all([
        sb.from("trinity_memory").select("agent, content, created_at").order("created_at", { ascending: false }).limit(20),
        sb.from("trinity_messages").select("from_agent, content, created_at").order("created_at", { ascending: false }).limit(20),
        sb.from("trinity_reports").select("agent, content, report_type, created_at").order("created_at", { ascending: false }).limit(10),
        sb.from("trinity_cycles").select("cycle_number, status, started_at").order("started_at", { ascending: false }).limit(1),
        sb.from("trinity_state").select("agent, cycle_count, health_score, last_run"),
      ]);

      const initial: LogEntry[] = [];

      // Add cycle info
      const cyc = cycRes.data?.[0];
      if (cyc) {
        setActiveCycle({ number: cyc.cycle_number, status: cyc.status });
        initial.push({ id: crypto.randomUUID(), ts: new Date(cyc.started_at), agent: "SYSTEM", type: "cycle", text: `Цикл #${cyc.cycle_number} — ${cyc.status}` });
      }

      // Merge messages and memories chronologically
      const allEntries: LogEntry[] = [];

      (memRes.data ?? []).reverse().forEach((m: any) => {
        allEntries.push({ id: crypto.randomUUID(), ts: new Date(m.created_at), agent: m.agent as AgentKey, type: "memory", text: String(m.content).slice(0, 200) });
      });
      (msgRes.data ?? []).reverse().forEach((m: any) => {
        allEntries.push({ id: crypto.randomUUID(), ts: new Date(m.created_at), agent: m.from_agent as AgentKey, type: "message", text: String(m.content).slice(0, 200) });
      });
      (repRes.data ?? []).reverse().forEach((r: any) => {
        allEntries.push({ id: crypto.randomUUID(), ts: new Date(r.created_at), agent: r.agent as AgentKey, type: "report", text: `[${r.report_type}] ${String(r.content).slice(0, 200)}` });
      });

      allEntries.sort((a, b) => a.ts.getTime() - b.ts.getTime());
      setLogs([...initial, ...allEntries].slice(-300));
      setStates((stRes.data ?? []) as AgentState[]);
    })();

    // Real-time subscriptions
    const channel = sb
      .channel("trinity-watch-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trinity_memory" }, (p) => {
        const d = p.new as any;
        addLog({ agent: d.agent as AgentKey, type: "memory", text: String(d.content).slice(0, 200) });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trinity_messages" }, (p) => {
        const d = p.new as any;
        addLog({ agent: d.from_agent as AgentKey, type: "message", text: String(d.content).slice(0, 200) });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trinity_reports" }, (p) => {
        const d = p.new as any;
        addLog({ agent: d.agent as AgentKey, type: "report", text: `[${d.report_type}] ${String(d.content).slice(0, 180)}` });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trinity_cycles" }, (p) => {
        const d = p.new as any;
        setActiveCycle({ number: d.cycle_number, status: d.status });
        addLog({ agent: "SYSTEM", type: "cycle", text: `Цикл #${d.cycle_number} → ${d.status}` });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trinity_state" }, () => {
        sb.from("trinity_state").select("agent, cycle_count, health_score, last_run").then(({ data }) => {
          setStates((data ?? []) as AgentState[]);
        });
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sb is stable
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, paused]);

  const visibleLogs = filter === "ALL" ? logs : logs.filter((l) => l.agent === filter);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Agent Status Bar */}
      <div className="grid grid-cols-3 gap-3">
        {(["VASYLIY", "HRYHORIY", "IOANN"] as AgentKey[]).map((key) => {
          const st = AGENT_STYLES[key];
          const state = states.find((s) => s.agent === key);
          return (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? "ALL" : key)}
              className={`rounded-xl border p-3 text-left transition-all ${
                filter === key
                  ? "border-white/20 bg-white/5"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span>{st.icon}</span>
                <span className={`text-xs font-bold ${st.color}`}>{st.label}</span>
                <span className={`ml-auto h-2 w-2 rounded-full ${state ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
              </div>
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div>Цикли: <span className="text-white font-medium">{state?.cycle_count ?? 0}</span></div>
                <div>Здоров&apos;я: <span className={`font-medium ${(state?.health_score ?? 0) > 80 ? "text-emerald-400" : "text-amber-400"}`}>{state?.health_score ?? "—"}%</span></div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Cycle Banner */}
      {activeCycle && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium ${
          activeCycle.status === "running"
            ? "border-sky-500/30 bg-sky-500/5 text-sky-300"
            : activeCycle.status === "completed"
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
            : "border-red-500/30 bg-red-500/5 text-red-300"
        }`}>
          <span className={activeCycle.status === "running" ? "animate-spin" : ""}>
            {activeCycle.status === "running" ? "🔄" : activeCycle.status === "completed" ? "✅" : "❌"}
          </span>
          Цикл #{activeCycle.number} — {activeCycle.status}
          {activeCycle.status === "running" && (
            <span className="ml-2 h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping" />
          )}
        </div>
      )}

      {/* Terminal Controls */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === "ALL" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}
            aria-label="Show all"
          >
            Всі
          </button>
          {(["VASYLIY", "HRYHORIY", "IOANN"] as AgentKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(filter === k ? "ALL" : k)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === k ? `bg-slate-700 ${AGENT_STYLES[k].color}` : "text-slate-500 hover:text-white"}`}
              aria-label={`Filter by ${k}`}
            >
              {AGENT_STYLES[k].icon}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-slate-600">{visibleLogs.length} подій</span>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${paused ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400 hover:text-white"}`}
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? "▶ Продовжити" : "⏸ Пауза"}
          </button>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 hover:text-white transition-colors"
            aria-label="Clear logs"
          >
            🗑 Очистити
          </button>
        </div>
      </div>

      {/* Main Terminal Window */}
      <div className="flex-1 rounded-2xl border border-slate-800 bg-[#0a0a0f] overflow-hidden flex flex-col min-h-[500px]">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/60" />
            <div className="h-3 w-3 rounded-full bg-amber-500/60" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-xs text-slate-500 font-mono ml-2">trinity-live — agent output stream</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
          </div>
        </div>

        {/* Log Stream */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 scroll-smooth">
          {visibleLogs.length === 0 && (
            <div className="text-slate-600 text-center py-12">
              <div className="text-2xl mb-3">👁</div>
              <div>Очікуємо активності агентів...</div>
              <div className="text-[10px] mt-1 text-slate-700">Агенти запускаються кожні 3 години</div>
            </div>
          )}
          {visibleLogs.map((log) => {
            const st = AGENT_STYLES[log.agent];
            return (
              <div key={log.id} className="flex gap-2 hover:bg-white/[0.02] rounded px-1 py-0.5 transition-colors">
                <span className="text-slate-600 shrink-0 tabular-nums">
                  {log.ts.toLocaleTimeString("uk", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className={`shrink-0 font-semibold ${st.color}`}>
                  {st.icon} {st.label}
                </span>
                <span className="text-slate-500 shrink-0">{TYPE_PREFIX[log.type]}</span>
                <span className="text-slate-300 break-all">{log.text}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

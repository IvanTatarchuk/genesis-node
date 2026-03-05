"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar, Plus, Trash2, ToggleLeft, ToggleRight,
  Clock, Loader, ChevronDown, ChevronUp, Bot
} from "lucide-react";
import { formatNextRun, HOURS, DAYS_OF_WEEK } from "@/lib/schedule-utils";

interface AgentOption { id: string; name: string; slug: string; price_per_task: number }
interface Schedule {
  id: string;
  name: string;
  goal: string;
  frequency: string;
  run_at_hour: number;
  run_at_dow: number;
  is_active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  run_count: number;
  agents: { id: string; name: string; slug: string; price_per_task: number } | null;
}

export default function ScheduleManager({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [expanded, setExpanded]   = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    agent_id:    agents[0]?.id ?? "",
    name:        "",
    goal:        "",
    frequency:   "weekly" as "daily" | "weekly" | "monthly",
    run_at_hour: 9,
    run_at_dow:  1,
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/schedules");
    const data = await res.json();
    setSchedules(data.schedules ?? []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.goal.trim() || !form.agent_id) return;
    setSaving(true);
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setAdding(false);
      setForm({ agent_id: agents[0]?.id ?? "", name: "", goal: "", frequency: "weekly", run_at_hour: 9, run_at_dow: 1 });
      load();
      router.refresh();
    }
    setSaving(false);
  }

  async function handleToggle(s: Schedule) {
    await fetch(`/api/schedules?id=${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !s.is_active }),
    });
    setSchedules((prev) => prev.map((x) => x.id === s.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this schedule?")) return;
    await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
    setSchedules((prev) => prev.filter((x) => x.id !== id));
  }

  const FREQ_LABELS = { daily: "Every day", weekly: "Every week", monthly: "Every month" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400" />
            Scheduled Tasks
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Automate recurring work — agents run on your schedule</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition"
          >
            <Plus className="h-3.5 w-3.5" /> New schedule
          </button>
        )}
      </div>

      {/* Create form */}
      {adding && (
        <div className="rounded-xl border border-indigo-500/30 bg-slate-900/80 p-4 space-y-3">
          {/* Agent picker */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Agent</label>
            <select
              value={form.agent_id}
              onChange={(e) => setForm((f) => ({ ...f, agent_id: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name} (⚡{a.price_per_task} cr)</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Name (optional)</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Weekly competitor check"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Goal */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Goal</label>
            <textarea
              value={form.goal}
              onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
              rows={3}
              placeholder="What should the agent do each time?"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Frequency + time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as "daily"|"weekly"|"monthly" }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              >
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Run at (UTC)</label>
              <select
                value={form.run_at_hour}
                onChange={(e) => setForm((f) => ({ ...f, run_at_hour: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              >
                {HOURS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.frequency === "weekly" && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Day of week</label>
              <select
                value={form.run_at_dow}
                onChange={(e) => setForm((f) => ({ ...f, run_at_dow: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={saving || !form.goal.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-medium text-white transition"
            >
              {saving ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
              Create schedule
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="h-5 w-5 animate-spin text-slate-600" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center">
          <Calendar className="mx-auto h-8 w-8 text-slate-700 mb-2" />
          <p className="text-xs text-slate-500">No schedules yet.</p>
          <p className="text-xs text-slate-600 mt-0.5">Automate recurring research, reports, and monitoring tasks.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => {
            const agent = s.agents;
            const isExpanded = expanded === s.id;
            return (
              <div
                key={s.id}
                className={`rounded-xl border p-4 transition ${s.is_active ? "border-slate-800 bg-slate-900/60" : "border-slate-800/40 bg-slate-950/60 opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : s.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
                      <p className="text-sm font-medium text-slate-200">{s.name}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-5 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Bot className="h-3 w-3" />
                        {agent?.name ?? "Unknown agent"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {FREQ_LABELS[s.frequency as keyof typeof FREQ_LABELS] ?? s.frequency}
                      </span>
                      <span className={s.next_run_at && new Date(s.next_run_at) <= new Date() ? "text-amber-400" : ""}>
                        Next: {formatNextRun(s.next_run_at)}
                      </span>
                      {s.run_count > 0 && <span>{s.run_count} runs</span>}
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggle(s)} title={s.is_active ? "Pause" : "Resume"}>
                      {s.is_active
                        ? <ToggleRight className="h-5 w-5 text-indigo-400 hover:text-indigo-300" />
                        : <ToggleLeft  className="h-5 w-5 text-slate-600 hover:text-slate-400" />
                      }
                    </button>
                    <button onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4 text-slate-600 hover:text-red-400 transition" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 ml-5 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-xs text-slate-500 font-medium mb-1">Goal:</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{s.goal}</p>
                    {s.last_run_at && (
                      <p className="text-[10px] text-slate-600 mt-2">
                        Last run: {new Date(s.last_run_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

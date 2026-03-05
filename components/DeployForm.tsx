"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, Sparkles, ChevronDown, ChevronUp, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { TASK_TEMPLATES } from "@/lib/task-templates";

interface Props {
  agentId:    string;
  isLoggedIn: boolean;
  agentSlug?: string;
}

export default function DeployForm({ agentId, isLoggedIn, agentSlug }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [goal,        setGoal]        = useState("");
  const [error,       setError]       = useState("");
  const [launching,   setLaunching]   = useState(false);
  const [showTpl,     setShowTpl]     = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Pre-fill from ?template= query param
  useEffect(() => {
    const tplId = searchParams.get("template");
    if (tplId) {
      const tpl = TASK_TEMPLATES.find((t) => t.id === tplId);
      if (tpl) {
        setGoal(tpl.goal);
        setShowTpl(true);
      }
    }
  }, [searchParams]);

  if (!isLoggedIn) {
    return (
      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-center space-y-3">
        <p className="text-sm text-slate-400">Sign in to deploy this agent.</p>
        <Link
          href={`/login?redirect=/agents/${agentSlug ?? ""}`}
          className="inline-block rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow shadow-indigo-500/40 transition hover:bg-indigo-500"
        >
          Sign in to deploy →
        </Link>
        <p className="text-[11px] text-slate-600">
          New users get <span className="text-emerald-400 font-medium">100 free credits</span> — no card needed
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) { setError("Please describe your goal."); return; }
    setError("");
    setLaunching(true);
    try {
      const res = await fetch("/api/tasks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ agent_id: agentId, goal: goal.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setError(`Insufficient credits (need ${json.required}, have ${json.balance}). Top up in your Dashboard.`);
        } else if (res.status === 429) {
          setError("Too many requests. Please wait a moment.");
        } else {
          setError(json.error ?? "Failed to launch. Please try again.");
        }
        return;
      }
      router.push(`/tasks/${json.task.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLaunching(false);
    }
  }

  // Group templates by category for the picker
  const categories = Array.from(new Set(TASK_TEMPLATES.map((t) => t.category)));

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      {/* ── Template picker ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowTpl((s) => !s)}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          Use a template
          {showTpl ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showTpl && (
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-2 max-h-72 overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat}>
                <button
                  type="button"
                  onClick={() => setActiveGroup(activeGroup === cat ? null : cat)}
                  className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-1 hover:text-slate-200 transition"
                >
                  <span>{cat}</span>
                  {activeGroup === cat ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {activeGroup === cat && (
                  <div className="space-y-1 mt-1">
                    {TASK_TEMPLATES.filter((t) => t.category === cat).map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => { setGoal(tpl.goal); setShowTpl(false); }}
                        className="flex items-start gap-2 w-full rounded-lg border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-left hover:border-indigo-500/40 hover:bg-slate-800/60 transition"
                      >
                        <span className="text-base shrink-0">{tpl.emoji}</span>
                        <div>
                          <p className="text-xs font-medium text-slate-200">{tpl.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                            {tpl.goal.slice(0, 80)}…
                          </p>
                        </div>
                        <span className="ml-auto shrink-0 text-[10px] text-indigo-400">~{tpl.estimatedCredits}cr</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Goal textarea ── */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-300">
          Your goal <span className="text-indigo-400">*</span>
          {goal.includes("[") && (
            <span className="ml-2 text-amber-400 text-[10px]">
              ✎ Replace the [brackets] with your specifics
            </span>
          )}
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="Describe what you want the agent to do, step by step…"
          className="w-full resize-y rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="flex items-center justify-between">
          <Link href="/templates" className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-indigo-400 transition">
            <Sparkles className="h-3 w-3" /> Browse all templates
          </Link>
          <p className="text-[11px] text-slate-600">{goal.length}/2000</p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-800/60 bg-red-900/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={launching || !goal.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 py-3 text-sm font-medium text-slate-950 shadow-lg shadow-indigo-500/30 transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Send className="h-4 w-4" />
        {launching ? "Launching…" : "Launch agent"}
      </button>

      <p className="text-center text-[11px] text-slate-600">
        Credits deducted only when the agent starts. Failed tasks are <span className="text-slate-400">automatically refunded</span>.
      </p>
    </form>
  );
}

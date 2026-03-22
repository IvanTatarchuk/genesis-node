"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, Sparkles, ChevronDown, ChevronUp, LayoutTemplate, Mic, Square } from "lucide-react";
import Link from "next/link";
import { TASK_TEMPLATES } from "@/lib/task-templates";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface SuggestedGoal {
  label: string;
  goal: string;
}

interface Props {
  agentId:    string;
  isLoggedIn: boolean;
  agentSlug?: string;
  suggestedGoals?: SuggestedGoal[];
}

export default function DeployForm({ agentId, isLoggedIn, agentSlug, suggestedGoals = [] }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [goal,        setGoal]        = useState("");
  const [error,       setError]       = useState("");
  const [launching,   setLaunching]   = useState(false);
  const [showTpl,         setShowTpl]         = useState(false);
  const [activeGroup,     setActiveGroup]     = useState<string | null>(null);
  const [launchWhenDone,  setLaunchWhenDone]  = useState(false);

  const { isListening, transcript, error: voiceError, isSupported: voiceSupported, startListening, stopListening, resetTranscript } = useVoiceInput({ lang: "en-US", continuous: true });

  // Sync voice transcript into goal while listening; on stop, keep the final goal
  useEffect(() => {
    if (isListening && transcript) setGoal(transcript);
  }, [isListening, transcript]);

  // When user stops listening and "Launch when done" was checked, submit (same as form submit)
  const submittedByVoiceRef = useRef(false);
  useEffect(() => {
    if (!isListening && launchWhenDone && goal.trim() && !submittedByVoiceRef.current) {
      submittedByVoiceRef.current = true;
      setLaunchWhenDone(false);
      setError("");
      setLaunching(true);
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, goal: goal.trim() }),
      })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) {
            if (res.status === 402) setError(`You need more credits (need ${json.required}, you have ${json.balance}). Top up in Dashboard.`);
            else if (res.status === 429) setError("Too many requests — wait a moment.");
            else setError(json.error ?? "Could not launch. Try again.");
            return;
          }
          router.push(`/tasks/${json.task.id}`);
        })
        .catch(() => setError("Connection issue. Try again."))
        .finally(() => setLaunching(false));
    }
    if (isListening) submittedByVoiceRef.current = false;
  }, [isListening, launchWhenDone, goal, agentId, router]);

  // Pre-fill from ?template= or ?goal= query param
  useEffect(() => {
    const tplId = searchParams.get("template");
    const goalParam = searchParams.get("goal");
    if (goalParam) {
      try {
        setGoal(decodeURIComponent(goalParam));
      } catch {
        setGoal(goalParam);
      }
      return;
    }
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
          href={`/login?next=/agents/${agentSlug ?? ""}`}
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
    if (!goal.trim()) { setError("Tell the agent what you want it to do — a short goal is enough."); return; }
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
          setError(`You need a few more credits for this run (need ${json.required}, you have ${json.balance}). Top up in your Dashboard — we'll only charge when the task runs.`);
        } else if (res.status === 429) {
          setError("You're sending a lot of requests — please wait a moment and try again.");
        } else {
          setError(json.error ?? "We couldn't launch the task. Please try again. If anything fails, credits are refunded automatically.");
        }
        return;
      }
      router.push(`/tasks/${json.task.id}`);
    } catch {
      setError("Connection issue. Please check your network and try again.");
    } finally {
      setLaunching(false);
    }
  }

  // Group templates by category for the picker
  const categories = Array.from(new Set(TASK_TEMPLATES.map((t) => t.category)));

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      {/* ── Quick try (suggested goals) ── */}
      {suggestedGoals.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Try one of these</p>
          <div className="flex flex-wrap gap-2">
            {suggestedGoals.map(({ label, goal: g }) => (
              <button
                key={label}
                type="button"
                onClick={() => setGoal(g)}
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white transition"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* ── Voice input ── */}
      {voiceSupported && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative inline-flex">
              {isListening && (
                <span className="absolute inset-0 rounded-xl border-2 border-amber-400/50 animate-ping opacity-40" />
              )}
              {!isListening ? (
                <button
                  type="button"
                  onClick={() => { resetTranscript(); startListening(); }}
                  className="relative inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-300 hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white transition"
                >
                  <Mic className="h-4 w-4 text-indigo-400" />
                  Speak your goal
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopListening}
                  className="relative inline-flex items-center gap-2 rounded-xl border border-amber-700/60 bg-amber-900/30 px-4 py-2.5 text-sm text-amber-200 transition"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop listening
                </button>
              )}
            </div>
            {isListening && goal.trim() && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={launchWhenDone}
                  onChange={(e) => setLaunchWhenDone(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">Launch when I stop</span>
              </label>
            )}
          </div>
          {voiceError && <p className="text-xs text-amber-400">{voiceError}</p>}
        </div>
      )}

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

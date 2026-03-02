"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SendIcon } from "lucide-react";
import Link from "next/link";

interface Props {
  agentId:    string;
  isLoggedIn: boolean;
}

const GOAL_EXAMPLES = [
  "Summarise the top 5 articles about AI agents on HackerNews today.",
  "Write and run a Python script that merges two CSV files on the 'id' column.",
  "Open Chrome, go to github.com/trending and screenshot the top 10 repos.",
];

export default function DeployForm({ agentId, isLoggedIn }: Props) {
  const router = useRouter();
  const [goal,      setGoal]      = useState("");
  const [error,     setError]     = useState("");
  const [launching, setLaunching] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center text-sm text-slate-400">
        <p>You need to sign in to deploy this agent.</p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow shadow-indigo-500/40 transition hover:bg-indigo-500"
        >
          Sign in →
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) {
      setError("Please describe your goal.");
      return;
    }
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
        } else {
          setError(json.error ?? "Failed to launch. Please try again.");
        }
        return;
      }

      // Redirect to the live stream page
      router.push(`/tasks/${json.task.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLaunching(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-300">
          Your goal <span className="text-indigo-400">*</span>
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Describe what you want the agent to do, step by step…"
          className="w-full resize-y rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />
        <p className="text-right text-[11px] text-slate-600">{goal.length}/2000</p>
      </div>

      {/* Example goals */}
      <div className="space-y-1">
        <p className="text-[11px] text-slate-600">Examples:</p>
        {GOAL_EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setGoal(ex)}
            className="block w-full rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-1.5 text-left text-[11px] text-slate-500 transition hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-300"
          >
            {ex}
          </button>
        ))}
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
        <SendIcon className="h-4 w-4" />
        {launching ? "Launching…" : "Launch agent"}
      </button>

      <p className="text-center text-[11px] text-slate-600">
        Credits are deducted only when the agent starts running.
        If the task fails, credits are automatically refunded.
      </p>
    </form>
  );
}

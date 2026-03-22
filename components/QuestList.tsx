"use client";

import { useEffect, useState } from "react";
import { Loader, Gift, Sparkles } from "lucide-react";

type QuestResetType = "daily" | "weekly" | "once";

interface Quest {
  id: string;
  title: string;
  description: string | null;
  reward_matadora: number;
  target_count: number;
  reset_type: QuestResetType;
  icon: string | null;
  period_key: string;
  progress: number;
  completed_at: string | null;
  claimed_at: string | null;
}

interface Props {
  compact?: boolean;
}

export default function QuestList({ compact = false }: Props) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/quests", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load quests");
        const data = await res.json();
        if (!cancelled) {
          setQuests(data.quests ?? []);
        }
      } catch {
        if (!cancelled) setError("We couldn't load quests. Refresh the page to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function claim(questId: string) {
    setClaimingId(questId);
    setError(null);
    try {
      const res = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quest_id: questId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't claim the reward. Try again in a moment.");
        return;
      }
      setQuests((prev) =>
        prev.map((q) =>
          q.id === questId
            ? { ...q, claimed_at: new Date().toISOString() }
            : q,
        ),
      );
    } catch {
      setError("Something went wrong. Try again in a moment.");
    } finally {
      setClaimingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-slate-500">
        <Loader className="mr-2 h-3.5 w-3.5 animate-spin text-indigo-400" />
        Loading quests…
      </div>
    );
  }

  if (!quests.length) return null;

  const grouped: Record<QuestResetType, Quest[]> = {
    daily: quests.filter((q) => q.reset_type === "daily"),
    weekly: quests.filter((q) => q.reset_type === "weekly"),
    once: quests.filter((q) => q.reset_type === "once"),
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-xs text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Quests</p>
            <p className="text-[11px] text-slate-500">
              Earn MATADORA by using the platform
            </p>
          </div>
        </div>
        {!compact && (
          <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-medium text-indigo-300">
            + MATADORA
          </span>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-400">{error}</p>
      )}

      <div className="space-y-3">
        {(["daily", "weekly", "once"] as QuestResetType[]).map((group) => {
          const list = grouped[group];
          if (!list.length) return null;
          return (
            <div key={group} className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                {group === "daily"
                  ? "Daily quests"
                  : group === "weekly"
                  ? "Weekly quests"
                  : "Milestones"}
              </p>
              <div className="space-y-1.5">
                {list.map((q) => {
                  const progress = Math.min(
                    1,
                    q.target_count > 0 ? q.progress / q.target_count : 0,
                  );
                  const completed = !!q.completed_at;
                  const claimed = !!q.claimed_at;
                  return (
                    <div
                      key={q.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-lg">
                        {q.icon ?? "⚡"}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-100">
                            {q.title}
                          </p>
                          <span className="text-[11px] font-semibold text-amber-300">
                            +{q.reward_matadora} 🪙
                          </span>
                        </div>
                        {q.description && (
                          <p className="text-[11px] text-slate-500">
                            {q.description}
                          </p>
                        )}
                        {q.target_count > 1 && (
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[10px] text-slate-600">
                              <span>
                                {q.progress}/{q.target_count}
                              </span>
                              <span>
                                {Math.round(progress * 100)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800">
                              <div
                                className={`h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all quest-progress-${Math.round(Math.min(100, Math.max(0, Math.round(progress * 100))) / 5) * 5}`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {claimed ? (
                          <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                            Claimed
                          </span>
                        ) : completed ? (
                          <button
                            type="button"
                            onClick={() => claim(q.id)}
                            disabled={claimingId === q.id}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                          >
                            <Gift className="h-3 w-3" />
                            {claimingId === q.id ? "Claiming…" : "Claim"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600">
                            In progress
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


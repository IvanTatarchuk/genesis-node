"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Loader } from "lucide-react";

interface Achievement {
  key: string;
  title: string;
  description: string | null;
  reward_matadora: number;
  icon: string | null;
  category: string | null;
  unlocked: boolean;
  unlocked_at: string | null;
}

export default function AchievementsGrid() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/achievements", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load achievements");
        const data = await res.json();
        if (!cancelled) setItems(data.achievements ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-xs text-slate-500">
        <Loader className="mr-2 h-3.5 w-3.5 animate-spin text-amber-400" />
        Loading achievements…
      </div>
    );
  }

  if (!items.length) return null;

  const unlocked = items.filter((a) => a.unlocked);
  const locked = items.filter((a) => !a.unlocked);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-xs text-white">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Achievements</p>
            <p className="text-[11px] text-slate-500">
              {unlocked.length}/{items.length} unlocked
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((a) => {
          const active = a.unlocked;
          return (
            <div
              key={a.key}
              className={`rounded-xl border px-3 py-2.5 text-xs transition ${
                active
                  ? "border-amber-500/60 bg-amber-900/30 text-amber-100"
                  : "border-slate-800 bg-slate-950/60 text-slate-500"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">
                  {a.icon ?? (active ? "🏅" : "🔒")}
                </span>
                <p className="font-semibold truncate">{a.title}</p>
              </div>
              {a.description && (
                <p className="text-[10px] line-clamp-2">{a.description}</p>
              )}
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className="text-amber-300">
                  +{a.reward_matadora} 🪙
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Medal className="h-3 w-3" />
                  {a.category ?? "general"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


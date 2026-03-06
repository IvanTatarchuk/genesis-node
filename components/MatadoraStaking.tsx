"use client";

import { useEffect, useState } from "react";
import { Loader, Lock, Unlock, Percent } from "lucide-react";

interface Stake {
  id: string;
  amount: number;
  duration_days: number;
  apy: number;
  starts_at: string;
  ends_at: string;
  status: "active" | "completed" | "cancelled";
  reward_earned: number;
}

interface ApiResponse {
  stakes: Stake[];
  balance: number;
  apy_table: Record<string, number>;
}

export default function MatadoraStaking() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState<30 | 60 | 90>(30);
  const [submitting, setSubmitting] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staking", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch {
      setError("Could not load staking data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createStake() {
    const value = parseInt(amount, 10);
    if (!value || value < 100) {
      setError("Minimum stake is 100 MATADORA");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/staking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, duration_days: duration }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create stake");
      } else {
        setAmount("");
        await load();
      }
    } catch {
      setError("Failed to create stake");
    } finally {
      setSubmitting(false);
    }
  }

  async function claimStake(id: string) {
    setClaimingId(id);
    setError(null);
    try {
      const res = await fetch("/api/staking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stake_id: id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to claim stake");
      } else {
        await load();
      }
    } catch {
      setError("Failed to claim stake");
    } finally {
      setClaimingId(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-slate-500">
        <Loader className="mr-2 h-3.5 w-3.5 animate-spin text-amber-400" />
        Loading staking…
      </div>
    );
  }

  if (!data) return null;

  const active = data.stakes.filter((s) => s.status === "active");
  const completed = data.stakes.filter((s) => s.status === "completed");

  const apy = data.apy_table ?? { "30": 5, "60": 10, "90": 15 };
  const selectedApy = apy[String(duration)] ?? 0;
  const amtNum = parseInt(amount, 10) || 0;
  const estReward = Math.floor(
    amtNum * (selectedApy / 100) * (duration / 365),
  );

  return (
    <section className="space-y-4 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">
              MATADORA Staking
            </p>
            <p className="text-[11px] text-slate-500">
              Lock tokens, earn yield, level up your status
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-500">Available</p>
          <p className="text-sm font-semibold text-amber-300">
            {data.balance.toLocaleString()} 🪙
          </p>
        </div>
      </div>

      {/* Create stake */}
      <div className="grid gap-3 sm:grid-cols-[1.2fr,0.9fr,auto] items-end">
        <div className="space-y-1">
          <label className="text-[11px] text-slate-500">
            Amount to stake (min 100)
          </label>
          <input
            type="number"
            min={100}
            step={50}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 500"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-slate-500 flex items-center gap-1">
            Duration
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
              <Percent className="h-3 w-3" />
              {selectedApy}% APY
            </span>
          </label>
          <div className="flex gap-1.5">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d as 30 | 60 | 90)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                  duration === d
                    ? "border-amber-500 bg-amber-500/20 text-amber-100"
                    : "border-slate-700 bg-slate-900 text-slate-400 hover:border-amber-500/40"
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-slate-500">Estimated reward</label>
          <button
            type="button"
            onClick={createStake}
            disabled={submitting || !amtNum || amtNum < 100}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-amber-500/30 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader className="h-3 w-3 animate-spin" />
                Staking…
              </>
            ) : (
              <>
                Stake & earn
                <span className="text-[10px] text-amber-100/80">
                  +{estReward || 0} est. 🪙
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-red-400">{error}</p>
      )}

      {/* Active stakes */}
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500">Active stakes</p>
          <div className="space-y-1.5">
            {active.map((s) => {
              const end = new Date(s.ends_at);
              const now = new Date();
              const remaining = Math.max(
                0,
                Math.ceil(
                  (end.getTime() - now.getTime()) / 86400000,
                ),
              );
              const totalDays = s.duration_days;
              const passedDays = Math.min(
                totalDays,
                Math.max(
                  0,
                  totalDays - remaining,
                ),
              );
              const progress =
                totalDays > 0 ? passedDays / totalDays : 0;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-slate-950/60 px-3 py-2.5"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-100">
                        {s.amount.toLocaleString()} staked
                      </p>
                      <span className="text-[10px] text-amber-300">
                        {s.apy}% APY · {s.duration_days}d
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>
                        {remaining > 0
                          ? `${remaining}d remaining`
                          : "Matures today"}
                      </span>
                      <span>
                        {Math.round(progress * 100)}% complete
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed stakes */}
      {completed.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-slate-500">Completed stakes</p>
          <div className="space-y-1">
            {completed.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-emerald-600/30 bg-emerald-950/20 px-3 py-2 text-[11px]"
              >
                <div>
                  <p className="font-medium text-emerald-200">
                    {s.amount.toLocaleString()} →{" "}
                    {(s.amount + s.reward_earned).toLocaleString()} 🪙
                  </p>
                  <p className="text-emerald-500/80">
                    Earned {s.reward_earned.toLocaleString()} MATADORA
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => claimStake(s.id)}
                  disabled={claimingId === s.id}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  <Unlock className="h-3 w-3" />
                  {claimingId === s.id ? "Claiming…" : "Claim"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}


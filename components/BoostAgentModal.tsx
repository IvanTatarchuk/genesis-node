"use client";

import { useState } from "react";
import { RocketIcon, XIcon, ZapIcon, CheckIcon } from "lucide-react";

const PLANS = [
  { key: "1d",  label: "1 день",   credits: 50,  perks: ["Топ маркетплейсу", "⚡ Boosted бейдж"] },
  { key: "3d",  label: "3 дні",    credits: 120, perks: ["Топ маркетплейсу", "Featured на головній", "⚡ Boosted бейдж"] },
  { key: "7d",  label: "7 днів",   credits: 250, perks: ["Топ маркетплейсу", "Featured на головній", "🏆 Пріоритет в пошуку", "⚡ Boosted бейдж"] },
  { key: "30d", label: "30 днів",  credits: 800, perks: ["Все вищезазначене", "📧 Розсилка клієнтам", "🎯 Максимальна видимість"] },
];

export default function BoostAgentModal({
  agentSlug,
  agentName,
  balance,
  onClose,
}: {
  agentSlug: string;
  agentName: string;
  balance: number;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState("3d");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const plan = PLANS.find((p) => p.key === selected)!;
  const canAfford = balance >= plan.credits;

  async function handleBoost() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentSlug, plan: selected }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Помилка");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Помилка мережі");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <RocketIcon className="h-5 w-5 text-indigo-400" />
            <h2 className="font-bold text-white">Буст агента</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Буст активовано!</h3>
            <p className="text-sm text-slate-400 mb-6">
              <strong className="text-white">{agentName}</strong> тепер на топ позиції маркетплейсу.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 transition py-3 text-sm font-semibold text-white"
            >
              Готово
            </button>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-slate-400 mb-4">
              Агент <strong className="text-white">@{agentSlug}</strong> буде показаний у топі маркетплейсу
            </p>

            {/* Plans */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {PLANS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelected(p.key)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    selected === p.key
                      ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  <div className="font-semibold text-white text-sm">{p.label}</div>
                  <div className="text-indigo-400 text-xs font-medium mt-0.5">⚡ {p.credits} кредитів</div>
                </button>
              ))}
            </div>

            {/* Perks */}
            <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4 mb-5">
              <p className="text-xs font-semibold text-slate-300 mb-2">Що входить:</p>
              <ul className="space-y-1.5">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-xs text-slate-400">
                    <ZapIcon className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
              <span>Твій баланс: <span className="text-white font-medium">⚡ {balance}</span></span>
              <span>Вартість: <span className={canAfford ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>⚡ {plan.credits}</span></span>
            </div>

            {error && (
              <p className="text-xs text-red-400 mb-3">{error}</p>
            )}

            {!canAfford && (
              <p className="text-xs text-amber-400 mb-3">
                Недостатньо кредитів. <a href="/pricing" className="underline">Поповнити баланс →</a>
              </p>
            )}

            <button
              onClick={handleBoost}
              disabled={loading || !canAfford}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition py-3 text-sm font-semibold text-white flex items-center justify-center gap-2"
            >
              {loading ? (
                "Активація..."
              ) : (
                <>
                  <RocketIcon className="h-4 w-4" />
                  Активувати буст — ⚡{plan.credits}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

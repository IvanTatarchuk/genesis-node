"use client";

import { useState } from "react";

export default function DeveloperRevenueCalculator() {
  const [tasksPerMonth, setTasksPerMonth] = useState(500);
  const [pricePerTask, setPricePerTask] = useState(50);
  const [sharePct, setSharePct] = useState(75);

  const creditsPerTask = pricePerTask;
  const grossCredits = tasksPerMonth * creditsPerTask;
  const grossUsd = (grossCredits / 100).toFixed(2);
  const yourShare = Math.floor(grossCredits * (sharePct / 100));
  const yourUsd = (yourShare / 100).toFixed(2);

  return (
    <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-6 sm:p-8 space-y-6">
      <h2 className="text-center text-xl font-bold text-white">
        💰 How much could you earn?
      </h2>
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400" htmlFor="tasks-per-month">
            Agent runs per month
          </label>
          <input
            type="range"
            min={50}
            max={5000}
            step={50}
            value={tasksPerMonth}
            onChange={(e) => setTasksPerMonth(Number(e.target.value))}
            id="tasks-per-month"
            className="w-full h-2 rounded-full appearance-none bg-slate-800 accent-emerald-500"
          />
          <p className="text-lg font-bold text-white">{tasksPerMonth.toLocaleString()}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400" htmlFor="price-per-task">
            Price per run (credits)
          </label>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={pricePerTask}
            onChange={(e) => setPricePerTask(Number(e.target.value))}
            id="price-per-task"
            className="w-full h-2 rounded-full appearance-none bg-slate-800 accent-indigo-500"
          />
          <p className="text-lg font-bold text-white">{pricePerTask} cr ≈ ${(pricePerTask / 100).toFixed(2)}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400" htmlFor="share-pct">
            Your share (%)
          </label>
          <input
            type="range"
            min={70}
            max={90}
            step={5}
            value={sharePct}
            onChange={(e) => setSharePct(Number(e.target.value))}
            id="share-pct"
            className="w-full h-2 rounded-full appearance-none bg-slate-800 accent-sky-500"
          />
          <p className="text-lg font-bold text-white">{sharePct}% to you</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 text-center">
        <p className="text-xs text-slate-500 mb-1">Your estimated monthly revenue</p>
        <p className="text-4xl font-black text-emerald-400">${yourUsd}</p>
        <p className="text-xs text-slate-500 mt-2">
          {tasksPerMonth.toLocaleString()} runs × {pricePerTask} cr × {sharePct}% = {yourShare.toLocaleString()} credits
        </p>
      </div>
      <p className="text-center text-xs text-slate-600">
        1 credit = $0.01. You choose the price per run. The more you earn — the higher your revenue share.
      </p>
    </div>
  );
}

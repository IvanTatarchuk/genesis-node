"use client";

import Link from "next/link";
import { Zap as BoltIcon } from "lucide-react";

interface Props {
  balance: number;
  subscriptionTier?: string | null;
  variant?: "dashboard" | "inline";
}

const LOW_CREDITS_THRESHOLD = 80;

export default function UpgradeCreditsBanner({
  balance,
  subscriptionTier,
  variant = "dashboard",
}: Props) {
  const isLow = balance < LOW_CREDITS_THRESHOLD;
  const isFree = !subscriptionTier || subscriptionTier === "free";
  const showNudge = isLow || (isFree && balance < 200);

  if (!showNudge) return null;
  if (variant === "inline" && !isLow) return null;

  const message = isLow
    ? `You have ${balance} credits left. Top up or switch to a subscription so your agents never stop.`
    : "Get predictable monthly credits — upgrade to a plan and save.";

  return (
    <div className="rounded-xl border border-amber-800/50 bg-gradient-to-r from-amber-950/40 to-slate-900/60 p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl shrink-0">⚡</span>
        <div>
          <p className="text-sm font-medium text-amber-200">
            {isLow ? "Credits running low" : "Unlock more with a subscription"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{message}</p>
        </div>
      </div>
      <Link
        href="/pricing"
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition"
      >
        <BoltIcon className="h-3.5 w-3.5" />
        {isLow ? "Get credits" : "View plans"}
      </Link>
    </div>
  );
}

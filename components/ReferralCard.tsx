"use client";

import { useState } from "react";

interface Props {
  referralCode: string;
  referralCount: number;
  referralEarned: number;
}

export default function ReferralCard({ referralCode, referralCount, referralEarned }: Props) {
  const [copied, setCopied] = useState(false);

  const referralUrl = typeof window !== "undefined"
    ? `${window.location.origin}/login?ref=${referralCode}`
    : `https://agents-dev-roan.vercel.app/login?ref=${referralCode}`;

  async function copyLink() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tweetText = encodeURIComponent(
    `I'm using Genesis Node to automate work with AI agents 🤖\n\nSign up with my link and we both get 200 free credits:\n`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(referralUrl)}`;

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-slate-900/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-100">Referral Program</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Invite friends — you <span className="text-emerald-400">both</span> get{" "}
            <span className="text-emerald-400 font-medium">200 free credits</span>
          </p>
        </div>
        <span className="text-2xl">🎁</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-indigo-400">{referralCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">friends invited</p>
        </div>
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-emerald-400">
            ⚡ {referralEarned.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">credits earned</p>
        </div>
      </div>

      {/* Code + copy */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
          Your referral link
        </p>
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-400 truncate">
            {referralUrl}
          </div>
          <button
            onClick={copyLink}
            className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              copied
                ? "border-emerald-700 bg-emerald-900/40 text-emerald-400"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Code badge */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5">
          <p className="text-[10px] text-slate-500">Code</p>
          <p className="font-mono font-bold text-slate-200 tracking-widest">{referralCode}</p>
        </div>
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-sky-700 hover:bg-sky-900/20 hover:text-sky-300"
        >
          𝕏 Share on X
        </a>
      </div>

      {/* Milestones */}
      <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Milestone rewards</p>
        {[
          { n: 1,  reward: "200 cr",    done: referralCount >= 1 },
          { n: 5,  reward: "1,500 cr",  done: referralCount >= 5 },
          { n: 10, reward: "5,000 cr",  done: referralCount >= 10 },
          { n: 25, reward: "Pro month free", done: referralCount >= 25 },
        ].map(({ n, reward, done }) => (
          <div key={n} className="flex items-center justify-between text-xs">
            <span className={done ? "text-emerald-400" : "text-slate-500"}>
              {done ? "✓" : "○"} {n} friend{n > 1 ? "s" : ""} invited
            </span>
            <span className={`font-medium ${done ? "text-emerald-400" : "text-slate-500"}`}>
              {reward}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

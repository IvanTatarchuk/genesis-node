"use client";

import { useState } from "react";

interface Props {
  taskId: string;
  goal: string;
  agentName: string;
}

export default function ShareCardClient({ taskId, goal, agentName }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/share/${taskId}`
    : `https://matadora.business/share/${taskId}`;

  const tweetText = encodeURIComponent(
    `âś… AI agent just completed: "${goal.slice(0, 80)}" in seconds\n\nBuilt with @GenesisNodeAI đź¤–\n\n`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`;

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-slate-300">Share this result</p>

      {/* URL bar */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 font-mono truncate">
          {shareUrl}
        </div>
        <button
          onClick={copyLink}
          className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition ${
            copied
              ? "border-emerald-700 bg-emerald-900/40 text-emerald-400"
              : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700"
          }`}
        >
          {copied ? "âś“ Copied!" : "Copy"}
        </button>
      </div>

      {/* Social share buttons */}
      <div className="flex gap-2">
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-sky-700 hover:bg-sky-900/30 hover:text-sky-300"
        >
          đť•Ź Share on X
        </a>
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-blue-700 hover:bg-blue-900/30 hover:text-blue-300"
        >
          in LinkedIn
        </a>
      </div>
    </div>
  );
}

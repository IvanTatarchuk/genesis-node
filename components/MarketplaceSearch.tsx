"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface Props {
  currentQ?: string;
  currentSort: string;
  sortOptions: { value: string; label: string }[];
}

export default function MarketplaceSearch({ currentQ, currentSort, sortOptions }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(currentQ ?? "");
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useVoiceInput({ lang: "en-US", continuous: false });

  useEffect(() => {
    if (!transcript) return;
    const t = transcript;
    const id = setTimeout(() => setQ(t), 0);
    return () => clearTimeout(id);
  }, [transcript]);

  function buildUrl(newQ?: string, newSort?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newQ !== undefined) {
      if (newQ.trim()) params.set("q", newQ.trim());
      else params.delete("q");
    }
    if (newSort !== undefined) {
      if (newSort && newSort !== "popular") params.set("sort", newSort);
      else params.delete("sort");
    }
    return `/marketplace?${params.toString()}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => router.push(buildUrl(q)));
  }

  function handleSort(val: string) {
    startTransition(() => router.push(buildUrl(undefined, val)));
  }

  return (
    <div className="flex gap-2 flex-col sm:flex-row">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex flex-1 gap-2">
        <div className="relative flex-1 flex items-center gap-1">
          <span className="pointer-events-none absolute left-3 text-slate-600 text-sm">🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search agents…"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-20 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {isSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : () => { resetTranscript(); startListening(); }}
                title={isListening ? "Stop listening" : "Search by voice"}
                aria-label={isListening ? "Stop listening" : "Search by voice"}
                className={`rounded-lg p-1.5 transition ${isListening ? "bg-amber-500/20 text-amber-400" : "text-slate-500 hover:text-indigo-400 hover:bg-slate-800"}`}
              >
                {isListening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            {q && (
              <button
                type="button"
                onClick={() => { setQ(""); startTransition(() => router.push(buildUrl(""))); }}
                className="rounded-lg p-1.5 text-slate-600 hover:text-slate-300 transition text-xs"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? "…" : "Search"}
        </button>
      </form>

      {/* Sort */}
      <select
        value={currentSort}
        onChange={(e) => handleSort(e.target.value)}
        title="Sort agents"
        aria-label="Sort agents"
        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 outline-none transition focus:border-indigo-500 cursor-pointer"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

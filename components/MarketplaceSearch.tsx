"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";

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
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm">🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search agents…"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(""); startTransition(() => router.push(buildUrl(""))); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition text-xs"
            >
              ✕
            </button>
          )}
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

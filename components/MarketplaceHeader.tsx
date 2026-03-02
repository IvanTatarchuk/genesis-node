"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BotIcon, SearchIcon } from "lucide-react";
import { useCallback, useState } from "react";

interface Props {
  allTags?: string[];
  activeTags: string[];
  currentTag?: string;
}

export default function MarketplaceHeader({ activeTags, currentTag }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/marketplace?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-slate-700">
              <BotIcon className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-sm font-medium tracking-[0.2em] text-slate-400 group-hover:text-slate-200 transition">
              GENESIS NODE
            </span>
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm text-slate-300 font-medium">Marketplace</span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents…"
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
          />
        </form>

        <Link
          href="/dashboard"
          className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 transition"
        >
          Dashboard
        </Link>
      </div>

      {/* Tag filter strip */}
      {activeTags.length > 0 && (
        <div className="mx-auto max-w-7xl px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <Link
            href="/marketplace"
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
              !currentTag
                ? "bg-indigo-600 text-white"
                : "border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            All
          </Link>
          {activeTags.map((t) => (
            <Link
              key={t}
              href={`/marketplace?tag=${encodeURIComponent(t)}`}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                currentTag === t
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

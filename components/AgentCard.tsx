"use client";

import Link from "next/link";
import { BoltIcon, CheckCircleIcon, SparklesIcon } from "lucide-react";
import type { Agent } from "@/lib/database.types";
import VerifiedBadge from "@/components/VerifiedBadge";
import SaveAgentButton from "@/components/SaveAgentButton";

interface Props {
  agent: Agent & {
    is_verified?:     boolean;
    health_status?:   string;
    uptime_30d_pct?:  number | null;
    avg_rating?:      number | null;
    review_count?:    number;
    is_boosted?:      boolean;
    screenshots?:     string[];
  };
  saved?: boolean;
  isLoggedIn?: boolean;
}

export default function AgentCard({ agent, saved = false, isLoggedIn = false }: Props) {
  const price = agent.price_per_task;
  const screenshots = agent.screenshots ?? [];

  return (
    <article className="group relative flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 transition hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-black/40">

      {isLoggedIn && (
        <SaveAgentButton agentId={agent.id} isLoggedIn initialSaved={saved} variant="card" />
      )}

      {/* Badges row (top-right) */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
        {agent.is_boosted && (
          <span className="flex items-center gap-1 rounded-full bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
            ⚡ Boosted
          </span>
        )}
        {agent.is_featured && !agent.is_boosted && (
          <span className="flex items-center gap-1 rounded-full bg-indigo-600/20 border border-indigo-500/40 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
            <SparklesIcon className="h-2.5 w-2.5" />
            Featured
          </span>
        )}
        {agent.is_verified && (
          <VerifiedBadge uptime={agent.uptime_30d_pct} />
        )}
      </div>

      {/* First screenshot or cover */}
      {screenshots.length > 0 ? (
        <div className="mb-3 -mx-1 -mt-1 rounded-xl overflow-hidden border border-slate-800/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={screenshots[0]} alt="" className="h-32 w-full object-cover bg-slate-800" />
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 ring-1 ring-slate-700/60 text-lg">
          {agent.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agent.cover_image_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : "🤖"}
        </div>
        <div className="min-w-0 pr-16">
          <h3 className="font-semibold text-slate-100 truncate">{agent.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-500 truncate">@{agent.slug}</p>
            {agent.avg_rating && (
              <span className="text-[10px] text-yellow-400 font-medium shrink-0">
                ★ {Number(agent.avg_rating).toFixed(1)}
                <span className="text-slate-600 font-normal ml-0.5">({agent.review_count ?? 0})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-400 leading-relaxed flex-1 line-clamp-3 mb-4">
        {agent.description}
      </p>

      {/* Tags */}
      {agent.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {agent.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-3 mt-auto">
        <span className="flex items-center gap-1">
          <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
          {(agent.total_tasks_completed ?? 0).toLocaleString()} tasks
        </span>
        {agent.health_status && agent.health_status !== "unknown" && (
          <span className={`flex items-center gap-1 ${
            agent.health_status === "healthy" ? "text-emerald-500" :
            agent.health_status === "degraded" ? "text-yellow-500" : "text-red-500"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full inline-block ${
              agent.health_status === "healthy" ? "bg-emerald-400 animate-pulse" :
              agent.health_status === "degraded" ? "bg-yellow-400" : "bg-red-500"
            }`} />
            {agent.health_status}
          </span>
        )}
        <span className="flex items-center gap-0.5 text-indigo-400 font-medium">
          <BoltIcon className="h-3 w-3" />
          {price} cr
        </span>
      </div>

      {/* CTA */}
      <Link
        href={`/agents/${agent.slug}`}
        className="mt-4 block w-full rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 py-2 text-center text-sm font-medium text-slate-950 shadow-md shadow-indigo-500/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        Deploy agent →
      </Link>
    </article>
  );
}

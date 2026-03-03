import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Agent } from "@/lib/database.types";
import DeployForm from "@/components/DeployForm";
import ReviewSection from "@/components/ReviewSection";
import Link from "next/link";
import {
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  TagIcon,
} from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AgentDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase  = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { error: agentErr, data: agentRaw } = await supabase
    .from("agents")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (agentErr || !agentRaw) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = agentRaw as any as Agent;
  const price  = (agent.price_per_task / 100).toFixed(2);

  // Fetch reviews + creator profile
  const service = createServiceClient();
  const [{ data: reviews }, { data: creator }] = await Promise.all([
    service
      .from("reviews")
      .select("id, rating, comment, created_at, reviewer:reviewer_id(display_name, avatar_url)")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(20),
    service
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", (agentRaw as unknown as { creator_id: string }).creator_id)
      .single(),
  ]);

  const userReview = user
    ? (reviews ?? []).find((r) => (r.reviewer as unknown as { id?: string })?.id === user.id) ?? null
    : null;

  const avgRating = (agentRaw as unknown as { avg_rating?: number }).avg_rating ?? null;
  const reviewCount = (agentRaw as unknown as { review_count?: number }).review_count ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
        {/* Left — Agent details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 ring-1 ring-slate-700 text-2xl">
                {agent.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agent.cover_image_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                ) : "🤖"}
              </div>
              <div>
                <div>
                <h1 className="text-2xl font-semibold text-slate-100">{agent.name}</h1>
                <p className="mt-1 text-sm text-slate-400">{agent.description}</p>
                {creator && (
                  <Link
                    href={`/dev/${creator.id}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition"
                  >
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-slate-400 ring-1 ring-slate-700">
                      {creator.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    by {creator.display_name ?? "Anonymous"}
                  </Link>
                )}
              </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
              {avgRating && (
                <span className="flex items-center gap-1 text-yellow-400 font-medium">
                  ★ {avgRating.toFixed(1)}
                  <span className="text-slate-500 font-normal">({reviewCount} reviews)</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
                {agent.total_tasks_completed.toLocaleString()} tasks completed
              </span>
              {agent.avg_completion_seconds && (
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="h-3.5 w-3.5 text-sky-500" />
                  ~{Math.round(agent.avg_completion_seconds / 60)} min average
                </span>
              )}
              <span className="flex items-center gap-1.5 font-medium text-indigo-400">
                <BoltIcon className="h-3.5 w-3.5" />
                {agent.price_per_task} credits (${price}) per task
              </span>
            </div>

            {/* Tags */}
            {agent.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <TagIcon className="h-3.5 w-3.5 shrink-0 self-center text-slate-600" />
                {agent.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Long description / readme */}
          {agent.long_description && (
            <div className="prose prose-sm prose-invert max-w-none rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">
                {agent.long_description}
              </pre>
            </div>
          )}

          {/* Reviews */}
          <ReviewSection
            agentSlug={slug}
            agentId={agent.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reviews={(reviews ?? []) as any}
            avgRating={avgRating}
            reviewCount={reviewCount}
            userReview={null}
            isLoggedIn={!!user}
          />
        </div>

        {/* Right — Deploy panel */}
        <div className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/50">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Deploy this agent
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Describe your goal in plain language. The agent will execute it autonomously and stream
              results back to you in real time.
            </p>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs">
              <span className="text-slate-500">Cost per run</span>
              <span className="flex items-center gap-1 font-semibold text-indigo-400">
                <BoltIcon className="h-3 w-3" />
                {agent.price_per_task} credits
              </span>
            </div>

            <DeployForm agentId={agent.id} isLoggedIn={!!user} />
          </div>
        </div>
      </div>
    </div>
  );
}

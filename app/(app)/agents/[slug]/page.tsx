import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Agent } from "@/lib/database.types";
import DeployForm from "@/components/DeployForm";
import ReviewSection from "@/components/ReviewSection";
import Link from "next/link";
import {
  Zap as BoltIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  Tag as TagIcon,
  Sparkles as SparklesIcon,
} from "lucide-react";
import { TASK_TEMPLATES } from "@/lib/task-templates";
import DonateToCreatorButton from "@/components/DonateToCreatorButton";
import AgentPageActions from "@/components/AgentPageActions";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agents-dev.vercel.app";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("agents")
    .select("name, description, avg_rating, tags")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Agent not found" };

  const title = `${data.name} – AI Agent`;
  const description = data.description?.slice(0, 160) ?? "";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:    `${BASE_URL}/agents/${slug}`,
      images: [{ url: `${BASE_URL}/agents/${slug}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      [`${BASE_URL}/agents/${slug}/opengraph-image`],
    },
  };
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

  const agent = agentRaw as unknown as Agent;
  const price  = (agent.price_per_task / 100).toFixed(2);

  const service = createServiceClient();
  const categorySlug = (agentRaw as unknown as { category_slug?: string }).category_slug ?? null;

  // Fetch reviews, creator, similar agents, saved state
  const creatorId = (agentRaw as unknown as { creator_id: string }).creator_id;
  const screenshots = (agentRaw as unknown as { screenshots?: string[] }).screenshots ?? [];
  const [{ data: reviews }, { data: creator }, { data: similarAgents }, { data: userBalance }, { data: savedRow }] = await Promise.all([
    service
      .from("reviews")
      .select("id, rating, comment, created_at, reviewer:reviewer_id(display_name, avatar_url)")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(20),
    service
      .from("profiles")
      .select("id, display_name, avatar_url, verified_developer")
      .eq("id", creatorId)
      .single(),
    categorySlug
      ? service
          .from("agents")
          .select("id, name, slug, description, price_per_task, total_tasks_completed")
          .eq("is_active", true)
          .eq("category_slug", categorySlug)
          .neq("id", agent.id)
          .order("total_tasks_completed", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] as unknown[] }),
    user
      ? service.from("profiles").select("balance").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    user
      ? service.from("saved_agents").select("agent_id").eq("user_id", user.id).eq("agent_id", agent.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const balance = (userBalance as { balance?: number } | null)?.balance ?? 0;
  const isSaved = !!savedRow;

  const userReview = user
    ? (reviews ?? []).find((r) => (r.reviewer as unknown as { id?: string })?.id === user.id) ?? null
    : null;

  const avgRating = (agentRaw as unknown as { avg_rating?: number }).avg_rating ?? null;
  const reviewCount = (agentRaw as unknown as { review_count?: number }).review_count ?? 0;

  // Suggested goals from templates matching agent category
  const suggestedGoals = categorySlug
    ? TASK_TEMPLATES
        .filter((t) => t.category === categorySlug)
        .slice(0, 4)
        .map((t) => ({ label: t.title, goal: t.goal }))
    : [];

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
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dev/${creator.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition"
                    >
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-slate-400 ring-1 ring-slate-700">
                        {(Array.isArray(creator) ? creator[0] : creator).display_name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      by {(Array.isArray(creator) ? creator[0] : creator).display_name ?? "Anonymous"}
                      {(Array.isArray(creator) ? creator[0] : creator).verified_developer && (
                        <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">Verified</span>
                      )}
                    </Link>
                    <DonateToCreatorButton
                      creatorId={creatorId}
                      creatorName={(Array.isArray(creator) ? creator[0] : creator).display_name ?? null}
                      balance={balance}
                      isLoggedIn={!!user}
                      isOwnAgent={user?.id === creatorId}
                    />
                  </div>
                )}
              <AgentPageActions
                agentId={agent.id}
                agentSlug={slug}
                agentName={agent.name}
                initialSaved={isSaved}
                isLoggedIn={!!user}
              />
              </div>
              </div>
            </div>

            {/* Screenshots gallery */}
            {screenshots.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2">
                {screenshots.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg overflow-hidden border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-32 w-auto max-w-[200px] object-cover bg-slate-800" />
                  </a>
                ))}
              </div>
            )}

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
            reviews={(reviews ?? []) as unknown as Array<{ id: string; rating: number; comment: string | null; created_at: string; reviewer: { display_name: string | null; avatar_url: string | null } | null }>}
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

            <DeployForm
              agentId={agent.id}
              isLoggedIn={!!user}
              agentSlug={slug}
              suggestedGoals={suggestedGoals}
            />
          </div>
        </div>
      </div>

      {/* Similar agents */}
      {similarAgents && similarAgents.length > 0 && (
        <section className="mt-16 pt-10 border-t border-slate-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200 mb-4">
            <SparklesIcon className="h-5 w-5 text-indigo-400" />
            You might also like
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {(similarAgents as Array<{ id: string; name: string; slug: string; description: string; price_per_task: number; total_tasks_completed?: number }>).map((a) => (
              <Link
                key={a.id}
                href={`/agents/${a.slug}`}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-indigo-500/40 hover:bg-slate-800/60 transition"
              >
                <p className="font-medium text-slate-100 text-sm truncate">{a.name}</p>
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{a.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-indigo-400 font-medium">{a.price_per_task} cr</span>
                  {(a.total_tasks_completed ?? 0) > 0 && (
                    <span className="text-slate-500">{a.total_tasks_completed} tasks</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

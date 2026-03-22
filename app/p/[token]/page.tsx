/**
 * Public shared pipeline page — /p/[token]
 * Anyone with the link can view and fork the pipeline
 */
import { createServiceClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { GitFork, Lock, Zap, ArrowRight } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agents-dev-roan.vercel.app";

interface Props { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const service = createServiceClient();
  const { data } = await service.from("pipelines").select("name, description").eq("share_token", token).single();
  if (!data) return { title: "Pipeline not found" };
  return {
    title: `${data.name} — shared pipeline`,
    description: data.description ?? "An AI agent pipeline shared on AGENTS.DEV",
  };
}

export default async function SharedPipelinePage({ params }: Props) {
  const { token } = await params;
  const service = createServiceClient();

  const { data: pipeline } = await service
    .from("pipelines")
    .select(`
      id, name, description, steps, is_public, fork_count, created_at,
      profiles!pipelines_owner_id_fkey ( display_name, avatar_url )
    `)
    .eq("share_token", token)
    .eq("is_public", true)
    .single();

  if (!pipeline) notFound();

  type Step = { agent_id?: string; agent_name?: string; description?: string; order?: number };
  const steps  = ((pipeline.steps as unknown) as Step[]) ?? [];
  const rawOwner = pipeline.profiles;
  const owner = Array.isArray(rawOwner) ? rawOwner[0] : rawOwner;
  const forks  = (pipeline as unknown as { fork_count: number }).fork_count ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white">G</div>
            <span className="font-semibold text-slate-200 text-sm">GENESIS NODE</span>
          </Link>
          <Link href="/login" className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition">
            Fork this pipeline →
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-12 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Shared by {owner?.display_name ?? "Anonymous"}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><GitFork className="h-3 w-3" /> {forks} forks</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{pipeline.name}</h1>
          {pipeline.description && (
            <p className="text-slate-400">{pipeline.description}</p>
          )}
        </div>

        {/* Pipeline steps */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Pipeline Steps ({steps.length})</h2>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-200 text-sm">{step.agent_name ?? `Agent ${i + 1}`}</p>
                  {step.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-slate-600 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fork CTA */}
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 to-slate-900/60 p-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-lg font-bold text-white">
            <GitFork className="h-6 w-6 text-indigo-400" />
            Fork this pipeline
          </div>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Copy this pipeline to your account with one click. Customize the agents and goals, then run it anytime.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/login?fork=${token}`}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
            >
              <GitFork className="h-4 w-4" />
              Fork pipeline (free)
            </Link>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Lock className="h-3 w-3" /> No credit card needed
            </span>
          </div>
          <p className="text-xs text-slate-600">
            New users get <span className="text-emerald-400 font-medium">100 free credits</span> to run this pipeline
          </p>
        </div>

        {/* What is this platform */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            What is GENESIS NODE?
          </h3>
          <p className="text-sm text-slate-400">
            A marketplace for autonomous AI agents. Deploy agents to research, write, scrape, analyze — anything. 
            Pay only when agents deliver results. Developers earn 70% revenue share.
          </p>
          <Link href="/marketplace" className="text-xs text-indigo-400 hover:text-indigo-300 transition">
            Browse 100+ agents →
          </Link>
        </div>
      </main>
    </div>
  );
}

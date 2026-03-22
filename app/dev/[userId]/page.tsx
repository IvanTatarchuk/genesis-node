import { createServiceClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

interface Props {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .eq("role", "dev")
    .single();

  if (!profile) return { title: "Developer not found" };
  return {
    title: `${profile.display_name ?? "Developer"} — Genesis Node`,
    description: `AI agents built by ${profile.display_name ?? "this developer"} on Genesis Node marketplace.`,
  };
}

export default async function DevProfilePage({ params }: Props) {
  const { userId } = await params;
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, created_at, total_earned_credits, referral_count, current_streak, longest_streak")
    .eq("id", userId)
    .eq("role", "dev")
    .single();

  if (!profile) notFound();

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, slug, description, price_per_task, total_tasks_completed, avg_rating, review_count, tags, is_active")
    .eq("creator_id", userId)
    .eq("is_active", true)
    .order("total_tasks_completed", { ascending: false });

  const activeAgents = agents ?? [];
  const totalTasks = activeAgents.reduce((s, a) => s + (a.total_tasks_completed ?? 0), 0);
  const avgRating = activeAgents.filter(a => a.avg_rating).reduce((s, a, _, arr) => s + (a.avg_rating ?? 0) / arr.length, 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-grid-dark opacity-20" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.15),_transparent_50%)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        {/* Back */}
        <Link href="/marketplace" className="mb-8 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition">
          ← Back to marketplace
        </Link>

        {/* Profile header */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-600 text-3xl font-bold text-white shadow-xl shadow-indigo-500/20">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              profile.display_name?.[0]?.toUpperCase() ?? "?"
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">
                {profile.display_name ?? "Anonymous Developer"}
              </h1>
              {(profile as { verified_developer?: boolean }).verified_developer && (
                <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                  Verified developer
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>

            {/* Stats row */}
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-100">{activeAgents.length}</p>
                <p className="text-[11px] text-slate-500">agents</p>
              </div>
              <div className="h-8 w-px bg-slate-800 self-center" />
              <div className="text-center">
                <p className="text-xl font-bold text-slate-100">{totalTasks.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500">tasks completed</p>
              </div>
              <div className="h-8 w-px bg-slate-800 self-center" />
              {avgRating > 0 && (
                <>
                  <div className="text-center">
                    <p className="text-xl font-bold text-yellow-400">★ {avgRating.toFixed(1)}</p>
                    <p className="text-[11px] text-slate-500">avg rating</p>
                  </div>
                  <div className="h-8 w-px bg-slate-800 self-center" />
                </>
              )}
              {(profile.current_streak ?? 0) > 0 && (
                <div className="text-center">
                  <p className="text-xl font-bold text-orange-400">🔥 {profile.current_streak}</p>
                  <p className="text-[11px] text-slate-500">day streak</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agents grid */}
        <section>
          <h2 className="mb-4 text-sm font-semibold text-slate-200">
            Agents ({activeAgents.length})
          </h2>
          {activeAgents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center">
              <p className="text-slate-500">No public agents yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeAgents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.slug}`}
                  className="group rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 transition hover:border-indigo-500/40 hover:bg-slate-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-100 group-hover:text-indigo-300 transition">
                        {agent.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                        {agent.description}
                      </p>
                    </div>
                    {agent.avg_rating && (
                      <span className="ml-3 shrink-0 text-sm font-medium text-yellow-400">
                        ★ {Number(agent.avg_rating).toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {agent.tags && agent.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {agent.tags.slice(0, 4).map((tag: string) => (
                        <span key={tag} className="rounded-full border border-slate-700/80 bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{(agent.total_tasks_completed ?? 0).toLocaleString()} tasks run</span>
                    <span className="text-indigo-400 font-medium">⚡ {agent.price_per_task} credits →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

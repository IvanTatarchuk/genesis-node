import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Agent } from "@/lib/database.types";
import AgentCard from "@/components/AgentCard";
import MarketplaceHeader from "@/components/MarketplaceHeader";

export const revalidate = 60; // ISR: re-generate every 60 s

async function getAgents(tag?: string): Promise<Agent[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("agents")
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("total_tasks_completed", { ascending: false });

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const agents = await getAgents(tag);

  const allTags = Array.from(
    new Set(agents.flatMap((a) => a.tags))
  ).sort();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <MarketplaceHeader activeTags={allTags} currentTag={tag} />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <p className="text-slate-400 text-lg">No agents found{tag ? ` for tag "${tag}"` : ""}.</p>
            <p className="text-slate-500 text-sm mt-1">Be the first to register one.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-6">
              {agents.length} agent{agents.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AgentCard from "@/components/AgentCard";

export const dynamic = "force-dynamic";

export default async function SavedAgentsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/marketplace/saved");

  const service = createServiceClient();
  const { data: savedRows } = await service
    .from("saved_agents")
    .select("agent_id")
    .eq("user_id", user.id);

  const agentIds = (savedRows ?? []).map((r: { agent_id: string }) => r.agent_id);

  if (agentIds.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-7xl px-6 py-12 text-center">
          <h1 className="text-xl font-semibold text-white">Saved agents</h1>
          <p className="mt-2 text-slate-400">You haven’t saved any agents yet.</p>
          <p className="mt-1 text-sm text-slate-500">Click the heart on any agent card to save it for later.</p>
          <Link href="/marketplace" className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500">
            Browse marketplace
          </Link>
        </div>
      </div>
    );
  }

  const { data: agentsRaw } = await service
    .from("agents")
    .select("id, name, slug, description, price_per_task, total_tasks_completed, avg_rating, review_count, tags, is_boosted, is_featured, category_slug, cover_image_url, verified, health_status, screenshots")
    .in("id", agentIds)
    .eq("is_active", true);

  const agents = (agentsRaw ?? []) as Array<Parameters<typeof AgentCard>[0]["agent"]>;
  const orderMap = new Map(agentIds.map((id, i) => [id, i]));
  agents.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-white">Saved agents</h1>
          <Link href="/marketplace" className="text-sm text-slate-500 hover:text-slate-300 transition">
            ← Marketplace
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} saved isLoggedIn />
          ))}
        </div>
      </div>
    </div>
  );
}

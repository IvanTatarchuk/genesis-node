import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PipelineBuilder from "@/components/PipelineBuilder";

export const metadata = { title: "Create Pipeline — Genesis Node" };

export default async function NewPipelinePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/pipelines/new");

  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles").select("role").eq("id", user.id).single();

  if ((profile as { role?: string } | null)?.role !== "dev") {
    redirect("/dashboard?error=dev_only");
  }

  // Fetch creator's own active agents
  const { data: agents } = await service
    .from("agents")
    .select("id, name, slug, description, price_per_task")
    .eq("creator_id", user.id)
    .eq("is_active", true)
    .order("name");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">🔗 Create Pipeline</h1>
        <p className="mt-1 text-sm text-slate-400">
          Chain your agents together. Each step receives the previous step&apos;s output.
          You earn from every run.
        </p>
      </div>

      {(!agents || agents.length < 2) ? (
        <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-6 space-y-3 text-center">
          <p className="text-2xl">🤖</p>
          <p className="text-sm font-medium text-amber-300">You need at least 2 active agents to build a pipeline.</p>
          <p className="text-xs text-slate-400">
            Currently you have {agents?.length ?? 0} agent{(agents?.length ?? 0) !== 1 ? "s" : ""}.
          </p>
          <Link href="/agents/new"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/50 bg-indigo-600/10 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/20 transition">
            + Register new agent
          </Link>
        </div>
      ) : (
        <PipelineBuilder availableAgents={agents as {
          id: string; name: string; slug: string; description: string; price_per_task: number;
        }[]} />
      )}
    </main>
  );
}

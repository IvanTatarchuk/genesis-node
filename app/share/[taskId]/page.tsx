import { createServiceClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import ShareCardClient from "@/components/ShareCardClient";

interface Props {
  params: Promise<{ taskId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { taskId } = await params;
  const supabase = createServiceClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("goal, status, agents(name)")
    .eq("id", taskId)
    .eq("status", "completed")
    .single();

  if (!task) {
    return { title: "Result not found — Genesis Node" };
  }

  const agentName = (task.agents as unknown as { name?: string })?.name ?? "AI Agent";
  const goal = task.goal.slice(0, 80);

  return {
    title: `${agentName} completed: "${goal}" — Genesis Node`,
    description: `An autonomous AI agent completed this task on Genesis Node. See the full result.`,
    openGraph: {
      title: `✅ ${agentName} completed: "${goal}"`,
      description: "Built with Genesis Node — AI Agent Marketplace",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `✅ ${agentName} completed: "${goal}"`,
      description: "Built with Genesis Node — AI Agent Marketplace",
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { taskId } = await params;
  const supabase = createServiceClient();

  const { data: task } = await supabase
    .from("tasks")
    .select(`
      id, goal, status, created_at, credits_charged,
      agents ( name, slug, description )
    `)
    .eq("id", taskId)
    .eq("status", "completed")
    .single();

  if (!task) notFound();

  // Get last 5 logs (result/thought)
  const { data: logs } = await supabase
    .from("logs")
    .select("type, content, created_at")
    .eq("task_id", taskId)
    .in("type", ["result", "thought", "action"])
    .order("created_at", { ascending: false })
    .limit(6);

  const agent = task.agents as unknown as { name: string; slug: string; description: string } | null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 bg-grid-dark opacity-20" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.15),_transparent_50%)]" />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        {/* Branding */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-slate-700">
              <span className="text-[10px] font-bold tracking-widest text-slate-200">GN</span>
            </div>
            <span className="text-sm font-medium tracking-[0.2em] text-slate-400">
              GENESIS NODE
            </span>
          </Link>
          <span className="text-xs text-slate-600">Shared result</span>
        </div>

        {/* Result card */}
        <div className="rounded-2xl border border-emerald-800/40 bg-slate-900/80 shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-800 bg-emerald-950/30 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-900/50 text-xl">
                ✅
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                  Task completed
                </p>
                <p className="mt-1 text-base font-semibold text-slate-100 line-clamp-2">
                  {task.goal}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {agent && (
                    <span className="flex items-center gap-1">
                      🤖 <span className="text-slate-400">{agent.name}</span>
                    </span>
                  )}
                  <span>⚡ {task.credits_charged} credits</span>
                  <span>📅 {new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logs */}
          {logs && logs.length > 0 && (
            <div className="border-b border-slate-800 px-6 py-4 space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Agent Activity</p>
              {[...logs].reverse().map((log, i) => {
                const logColors: Record<string, string> = {
                  result: "text-emerald-400",
                  thought: "text-indigo-400",
                  action: "text-sky-400",
                };
                const logIcons: Record<string, string> = {
                  result: "✓",
                  thought: "💭",
                  action: "▶",
                };
                return (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className={`shrink-0 font-mono font-bold ${logColors[log.type] ?? "text-slate-400"}`}>
                      {logIcons[log.type] ?? "•"}
                    </span>
                    <p className="text-slate-300 line-clamp-2">{log.content}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Share + CTA */}
          <div className="px-6 py-5 space-y-4">
            <ShareCardClient taskId={task.id} goal={task.goal} agentName={agent?.name ?? "AI Agent"} />

            {agent && (
              <div className="pt-2 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-3">
                  Want to run this agent yourself?
                </p>
                <Link
                  href={`/agents/${agent.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
                >
                  🚀 Deploy {agent.name} →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-600">
          Built with{" "}
          <Link href="/" className="text-slate-400 hover:text-slate-200 transition">
            Genesis Node
          </Link>{" "}
          — the marketplace for autonomous AI agents.
        </p>
      </div>
    </main>
  );
}

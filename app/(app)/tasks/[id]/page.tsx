import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Task, Log } from "@/lib/database.types";
import LiveStream from "@/components/LiveStream";

interface Props {
  params: Promise<{ id: string }>;
}

async function getTaskWithLogs(id: string): Promise<{ task: Task; logs: Log[]; agentSlug: string | null } | null> {
  const supabase = await createServerSupabaseClient();

  const taskRes = await supabase
    .from("tasks")
    .select("*, agent:agents(slug)")
    .eq("id", id)
    .single() as { error: unknown; data: unknown };

  if (taskRes.error || !taskRes.data) return null;

  const taskRow = taskRes.data as Task & { agent?: { slug: string } | null };
  const agentSlug = taskRow.agent?.slug ?? null;

  const logsRes = await supabase
    .from("logs")
    .select("*")
    .eq("task_id", id)
    .order("timestamp", { ascending: true })
    .limit(500);

  const { agent: _a, ...task } = taskRow;
  return {
    task:  task as unknown as Task,
    logs: (logsRes.data ?? []) as unknown as Log[],
    agentSlug,
  };
}

export default async function TaskPage({ params }: Props) {
  const { id } = await params;
  const data = await getTaskWithLogs(id);

  if (!data) notFound();

  const { task, logs, agentSlug } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LiveStream task={task} initialLogs={logs} agentSlug={agentSlug} taskGoal={task.goal} />
    </div>
  );
}

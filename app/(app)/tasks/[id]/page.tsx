import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Task, Log } from "@/lib/database.types";
import LiveStream from "@/components/LiveStream";

interface Props {
  params: Promise<{ id: string }>;
}

async function getTaskWithLogs(id: string): Promise<{ task: Task; logs: Log[] } | null> {
  const supabase = await createServerSupabaseClient();

  const taskRes = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (taskRes.error) return null;

  const logsRes = await supabase
    .from("logs")
    .select("*")
    .eq("task_id", id)
    .order("timestamp", { ascending: true })
    .limit(500);

  return {
    task:  taskRes.data as unknown as Task,
    logs: (logsRes.data ?? []) as unknown as Log[],
  };
}

export default async function TaskPage({ params }: Props) {
  const { id } = await params;
  const data = await getTaskWithLogs(id);

  if (!data) notFound();

  const { task, logs } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LiveStream task={task} initialLogs={logs} />
    </div>
  );
}

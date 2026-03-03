import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { sendTaskCompleteEmail, sendTaskFailedEmail } from "@/lib/email";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.TASK_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const record    = body.record;
  const oldRecord = body.old_record;

  if (!record || !oldRecord) return NextResponse.json({ received: true });

  const newStatus = record.status as string;
  const oldStatus = oldRecord.status as string;

  if (newStatus === oldStatus) return NextResponse.json({ received: true });
  if (newStatus !== "completed" && newStatus !== "failed") return NextResponse.json({ received: true });

  const service = createServiceClient();

  // ── Pipeline chaining ─────────────────────────────────────────────────────
  if (newStatus === "completed" && record.pipeline_execution_id) {
    await advancePipeline(service, record);
  }

  // ── Email + streak ────────────────────────────────────────────────────────
  const { data: task } = await service
    .from("tasks")
    .select(`id, goal, credits_charged, started_at, completed_at, result_text,
             pipeline_execution_id, pipeline_step,
             agents ( name ),
             profiles!tasks_client_id_fkey ( display_name )`)
    .eq("id", record.id)
    .single();

  if (!task) return NextResponse.json({ received: true });

  // Skip email for intermediate pipeline steps (not the last one)
  const isPipelineStep  = !!record.pipeline_execution_id;
  const isLastStep = await checkIsLastPipelineStep(service, record);
  if (isPipelineStep && !isLastStep) return NextResponse.json({ received: true });

  const { data: { user } } = await service.auth.admin.getUserById(record.client_id);
  if (!user?.email) return NextResponse.json({ received: true });

  const agentName  = (task.agents  as unknown as { name?: string })?.name ?? "AI Agent";
  const userName   = (task.profiles as unknown as { display_name?: string })?.display_name ?? "there";
  const elapsedSecs = task.started_at && task.completed_at
    ? Math.round((new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000)
    : undefined;

  if (newStatus === "completed") {
    await service.rpc("update_streak", { p_user_id: record.client_id });
    await sendTaskCompleteEmail({
      to: user.email, userName,
      taskId: task.id, goal: task.goal, agentName,
      creditsCharged: task.credits_charged, elapsedSecs,
    });
  } else if (newStatus === "failed") {
    // If pipeline step fails → mark whole execution failed
    if (record.pipeline_execution_id) {
      await service
        .from("pipeline_executions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", record.pipeline_execution_id);
    }
    await sendTaskFailedEmail({
      to: user.email, userName,
      taskId: task.id, goal: task.goal, agentName,
    });
  }

  return NextResponse.json({ received: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function advancePipeline(
  service: ReturnType<typeof createServiceClient>,
  record: { id: string; client_id: string; pipeline_execution_id: string; pipeline_step: number; result_text?: string }
) {
  const execId   = record.pipeline_execution_id;
  const stepDone = record.pipeline_step ?? 0;

  // Fetch execution + pipeline steps
  const { data: execution } = await service
    .from("pipeline_executions")
    .select("id, pipeline_id, initial_goal, total_steps, current_step, client_id, status")
    .eq("id", execId)
    .single();

  const exec = execution as typeof execution & { status?: string } | null;
  if (!exec || exec.status === "completed" || exec.status === "failed") return;

  const nextStep = stepDone + 1;

  // All steps done → distribute revenue + mark completed
  if (nextStep >= exec.total_steps) {
    await service.from("pipeline_executions").update({
      status:       "completed",
      current_step: nextStep,
      final_result: record.result_text ?? null,
      updated_at:   new Date().toISOString(),
    }).eq("id", execId);

    await service.rpc("distribute_pipeline_revenue", { p_execution_id: execId });
    return;
  }

  // Fetch pipeline to get next agent
  const { data: pipeline } = await service
    .from("pipelines")
    .select("steps")
    .eq("id", exec.pipeline_id)
    .single();

  const steps = (pipeline?.steps as Array<{ agent_id: string; order: number }> | null) ?? [];
  const nextAgentStep = steps.find((s) => s.order === nextStep);
  if (!nextAgentStep) return;

  // The input for the next step is the output of the current step
  const nextGoal = record.result_text
    ? `[Pipeline step ${nextStep + 1}/${exec.total_steps}]\nPrevious output:\n${record.result_text}\n\nOriginal goal: ${exec.initial_goal}`
    : exec.initial_goal;

  // Create next task
  await service.from("tasks").insert({
    client_id:             exec.client_id,
    agent_id:              nextAgentStep.agent_id,
    goal:                  nextGoal,
    status:                "pending",
    pipeline_execution_id: execId,
    pipeline_step:         nextStep,
  });

  // Update execution step
  await service.from("pipeline_executions").update({
    current_step: nextStep,
    updated_at:   new Date().toISOString(),
  }).eq("id", execId);
}

async function checkIsLastPipelineStep(
  service: ReturnType<typeof createServiceClient>,
  record: { pipeline_execution_id?: string; pipeline_step?: number }
): Promise<boolean> {
  if (!record.pipeline_execution_id) return true;

  const { data } = await service
    .from("pipeline_executions")
    .select("total_steps")
    .eq("id", record.pipeline_execution_id)
    .single();

  if (!data) return true;
  return (record.pipeline_step ?? 0) >= data.total_steps - 1;
}

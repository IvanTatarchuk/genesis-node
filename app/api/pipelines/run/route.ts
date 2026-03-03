import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pipeline_slug, goal } = await req.json() as { pipeline_slug: string; goal: string };
  if (!pipeline_slug || !goal?.trim())
    return NextResponse.json({ error: "pipeline_slug and goal are required" }, { status: 422 });

  const service = createServiceClient();

  // Fetch pipeline
  const { data: pipeline } = await service
    .from("pipelines")
    .select("id, steps, price_per_run, is_active")
    .eq("slug", pipeline_slug)
    .single();

  if (!pipeline || !pipeline.is_active)
    return NextResponse.json({ error: "Pipeline not found or inactive" }, { status: 404 });

  const steps = pipeline.steps as Array<{ agent_id: string; agent_name: string; order: number }>;
  if (!steps || steps.length === 0)
    return NextResponse.json({ error: "Pipeline has no steps" }, { status: 422 });

  // Check balance
  const { data: profile } = await service
    .from("profiles").select("balance").eq("id", user.id).single();
  if ((profile as { balance?: number } | null)?.balance === undefined ||
      (profile as { balance: number }).balance < pipeline.price_per_run) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  // Create execution record
  const { data: execution, error: execErr } = await service
    .from("pipeline_executions")
    .insert({
      pipeline_id:   pipeline.id,
      client_id:     user.id,
      initial_goal:  goal.trim(),
      current_step:  0,
      total_steps:   steps.length,
      status:        "running",
    })
    .select("id")
    .single();

  if (execErr || !execution)
    return NextResponse.json({ error: "Failed to start pipeline" }, { status: 500 });

  // Charge upfront
  const { error: chargeErr } = await service.rpc("charge_pipeline", {
    p_client_id:    user.id,
    p_pipeline_id:  pipeline.id,
    p_execution_id: execution.id,
    p_credits:      pipeline.price_per_run,
  });

  if (chargeErr) {
    await service.from("pipeline_executions").delete().eq("id", execution.id);
    return NextResponse.json({ error: chargeErr.message }, { status: 402 });
  }

  // Create first task (step 0)
  const firstStep = steps.find((s) => s.order === 0) ?? steps[0];
  const { data: firstTask } = await service
    .from("tasks")
    .insert({
      client_id:             user.id,
      agent_id:              firstStep.agent_id,
      goal:                  goal.trim(),
      status:                "pending",
      pipeline_execution_id: execution.id,
      pipeline_step:         0,
    })
    .select("id")
    .single();

  return NextResponse.json({
    execution_id: execution.id,
    first_task_id: firstTask?.id,
    total_steps: steps.length,
    stream_url: firstTask ? `/tasks/${firstTask.id}` : null,
  }, { status: 201 });
}

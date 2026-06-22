import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase-server";
import type { Agent, Profile } from "@/lib/database.types";
import { rateLimit, TASK_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/tasks  — authenticated client creates a new task
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, supabase } = auth;

  // Rate limit: 10 task creations per user per minute
  const rl = rateLimit(`tasks:${user.id}`, TASK_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before creating more tasks.", retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const body = await req.json();
  const { agent_id, goal } = body as { agent_id?: string; goal?: string };

  if (!agent_id || !goal?.trim()) {
    return NextResponse.json(
      { error: "agent_id and goal are required" },
      { status: 422 }
    );
  }

  // Verify agent exists and is active
  const agentRes = await supabase
    .from("agents")
    .select("*")
    .eq("id", agent_id)
    .single();

  const agent = agentRes.data as unknown as Agent | null;

  if (agentRes.error || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (!agent.is_active) {
    return NextResponse.json({ error: "Agent is not currently active" }, { status: 409 });
  }

  // Pre-flight balance check (authoritative check happens in charge_task())
  const profileRes = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileRes.data as unknown as Profile | null;

  if (!profile || profile.balance < agent.price_per_task) {
    return NextResponse.json(
      { error: "Insufficient credits", required: agent.price_per_task, balance: profile?.balance ?? 0 },
      { status: 402 }
    );
  }

  // Insert the task — orchestrator will pick it up via Realtime
  const service = createServiceClient();
  const { data: task, error: taskErr } = await service
    .from("tasks")
    .insert({ client_id: user.id, agent_id, goal: goal.trim() })
    .select("id, status, created_at")
    .single();

  if (taskErr || !task) {
    console.error("[POST /api/tasks]", taskErr);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }

  return NextResponse.json({ task }, { status: 201 });
}


// DELETE /api/tasks?id=<taskId>  — cancel a pending task and get a refund
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user } = auth;

  const service = createServiceClient();

  const taskId = req.nextUrl.searchParams.get("id");
  if (!taskId) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  // Fetch task and verify ownership
  const { data: task, error: fetchErr } = await service
    .from("tasks")
    .select("id, client_id, agent_id, status")
    .eq("id", taskId)
    .single() as { data: { id: string; client_id: string; agent_id: string; status: string } | null; error: unknown };

  if (fetchErr || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.client_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["pending", "running"].includes(task.status)) {
    return NextResponse.json({ error: `Cannot cancel a task with status "${task.status}"` }, { status: 409 });
  }

  // Mark task as cancelled
  const { error: updateErr } = await service
    .from("tasks")
    .update({
      status:       "cancelled",
      result_text:  "Cancelled by user.",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (updateErr) {
    return NextResponse.json({ error: "Failed to cancel task" }, { status: 500 });
  }

  // Refund credits only for pending tasks (running tasks may have consumed resources)
  if (task.status === "pending") {
    const { data: agent } = await service
      .from("agents")
      .select("price_per_task")
      .eq("id", task.agent_id)
      .single() as { data: { price_per_task: number } | null };

    if (agent?.price_per_task) {
      const { data: profile } = await service
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single() as { data: { balance: number } | null };

      if (profile) {
        await service.from("profiles").update({ balance: profile.balance + agent.price_per_task }).eq("id", user.id);
        await service.from("credit_transactions").insert({
          profile_id:   user.id,
          amount:       agent.price_per_task,
          type:         "refund",
          reference_id: taskId,
          description:  `Refund for cancelled task`,
        });
      }
    }
  }

  return NextResponse.json({ success: true, refunded: task.status === "pending" });
}

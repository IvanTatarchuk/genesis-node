import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import type { Agent, Profile } from "@/lib/database.types";

// POST /api/tasks  — authenticated client creates a new task
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

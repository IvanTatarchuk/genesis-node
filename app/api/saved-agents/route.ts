import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("saved_agents")
    .select("agent_id")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const agentIds = (data ?? []).map((r: { agent_id: string }) => r.agent_id);
  return NextResponse.json({ agentIds });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agent_id: agentId } = await req.json();
  if (!agentId || typeof agentId !== "string") {
    return NextResponse.json({ error: "agent_id required" }, { status: 422 });
  }

  const service = createServiceClient();
  const { error } = await service.from("saved_agents").upsert(
    { user_id: user.id, agent_id: agentId },
    { onConflict: "user_id,agent_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");
  if (!agentId) {
    return NextResponse.json({ error: "agent_id required" }, { status: 422 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("saved_agents")
    .delete()
    .eq("user_id", user.id)
    .eq("agent_id", agentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json();
  const topic: string = body?.topic?.trim() ?? "";
  const participants: string[] = body?.participants ?? [];

  if (!topic || topic.length < 10) return NextResponse.json({ error: "Topic too short" }, { status: 422 });
  if (participants.length < 2) return NextResponse.json({ error: "Select at least 2 scientists" }, { status: 422 });

  const service = createServiceClient();

  const { data: session, error: sessionErr } = await service
    .from("lab_sessions")
    .insert({
      title: "Lab Session: " + topic.slice(0, 60),
      topic,
      status: "active",
      participants,
      started_by: user.id,
      output: { startups_created: 0, ideas_proposed: 0, in_progress: true },
    })
    .select("id, title")
    .single();

  if (sessionErr || !session) return NextResponse.json({ error: "Failed to create session" }, { status: 500 });

  const { data: agents } = await service
    .from("agents")
    .select("id, slug, name, config_blob, price_per_task")
    .in("slug", participants);

  if (!agents || agents.length === 0) return NextResponse.json({ error: "No scientist agents found" }, { status: 404 });

  const { data: profile } = await service
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .single() as { data: { balance: number } | null };

  const totalCost = agents.reduce((s, a) => s + a.price_per_task, 0);
  if ((profile?.balance ?? 0) < totalCost) {
    return NextResponse.json({ error: "Insufficient credits. Need " + totalCost + ". Top up at /pricing" }, { status: 402 });
  }

  const taskIds: string[] = [];
  for (const agent of agents) {
    const config = (agent.config_blob as Record<string, unknown>) ?? {};
    const emoji = (config.emoji as string) ?? "🧠";
    const colleagues = agents.filter(a => a.slug !== agent.slug).map(a => a.name).join(", ");
    const goal = "[LAB SESSION " + session.id + "] " + topic + ". Colleagues: " + colleagues + ". Use your expertise to generate startup/SaaS ideas. Include: company name, problem, solution, tech stack, revenue model, ARR estimate. TASK_COMPLETE: summary";

    const { data: task } = await service
      .from("tasks")
      .insert({ client_id: user.id, agent_id: agent.id, goal, status: "pending" })
      .select("id")
      .single() as { data: { id: string } | null };

    if (task) {
      taskIds.push(task.id);
      await service.from("lab_messages").insert({
        session_id: session.id,
        agent_slug: agent.slug,
        agent_name: agent.name.replace(" \u2014 Scientific Lab AI", ""),
        agent_emoji: emoji,
        type: "thought",
        content: "Joining session on: \"" + topic.slice(0, 60) + "\". Preparing analysis...",
      });
    }
  }

  return NextResponse.json({
    success: true,
    session_id: session.id,
    session_title: session.title,
    scientists_activated: agents.length,
    tasks_created: taskIds.length,
  }, { status: 201 });
}

export async function GET(): Promise<NextResponse> {
  const service = createServiceClient();
  const { data: sessions } = await service
    .from("lab_sessions")
    .select("id, title, topic, status, participants, output, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  return NextResponse.json({ sessions: sessions ?? [] });
}

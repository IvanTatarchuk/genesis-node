import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import crypto from "crypto";
import { rateLimit, API_KEY_RATE_LIMIT } from "@/lib/rate-limit";

async function authenticateApiKey(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer gn_live_")) return null;

  const rawKey = auth.replace("Bearer ", "");
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const service = createServiceClient();
  const { data: key } = await service
    .from("api_keys")
    .select("profile_id, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (!key) return null;
  if (key.expires_at && new Date(key.expires_at) < new Date()) return null;

  // Update last_used
  await service.from("api_keys").update({ last_used: new Date().toISOString() }).eq("key_hash", keyHash);

  return key.profile_id;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const profileId = await authenticateApiKey(req);
  if (!profileId) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  // Rate limit: 30 API calls per key per minute
  const rl = rateLimit(`api_v1:${profileId}`, API_KEY_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 30 requests/minute.", remaining: 0, resetAt: rl.resetAt },
      { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(rl.resetAt) } }
    );
  }

  const { agent_slug, goal } = await req.json();
  if (!agent_slug || !goal?.trim()) {
    return NextResponse.json({ error: "agent_slug and goal are required" }, { status: 422 });
  }

  const service = createServiceClient();

  // Get agent
  const { data: agent } = await service
    .from("agents")
    .select("id, price_per_task, is_active")
    .eq("slug", agent_slug)
    .eq("is_active", true)
    .single();

  if (!agent) {
    return NextResponse.json({ error: `Agent '${agent_slug}' not found or inactive` }, { status: 404 });
  }

  // Check balance
  const { data: profile } = await service
    .from("profiles")
    .select("balance")
    .eq("id", profileId)
    .single();

  if ((profile?.balance ?? 0) < agent.price_per_task) {
    return NextResponse.json(
      { error: "Insufficient credits. Top up at https://agents-dev-roan.vercel.app/pricing" },
      { status: 402 }
    );
  }

  // Create task
  const { data: task, error } = await service.from("tasks").insert({
    client_id: profileId,
    agent_id:  agent.id,
    goal:      goal.trim(),
    status:    "pending",
  }).select("id, status, created_at").single();

  if (error || !task) {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }

  return NextResponse.json({
    task_id:     task.id,
    status:      task.status,
    created_at:  task.created_at,
    stream_url:  `https://agents-dev-roan.vercel.app/tasks/${task.id}`,
    logs_url:    `https://agents-dev-roan.vercel.app/api/v1/tasks/${task.id}/logs`,
  }, { status: 201 });
}

/**
 * Webhook management API for developers.
 * GET    /api/webhooks/manage       — list webhooks
 * POST   /api/webhooks/manage       — register new webhook
 * DELETE /api/webhooks/manage?id=X  — remove webhook
 * PATCH  /api/webhooks/manage?id=X  — update webhook (toggle active / change url)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

const ALLOWED_EVENTS = ["task.completed", "task.failed", "task.started", "task.cancelled"];
const MAX_WEBHOOKS_PER_USER = 5;

// ── GET — list ──────────────────────────────────────────────────────────────
export async function GET(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: webhooks } = await service
    .from("dev_webhooks")
    .select("id, url, events, is_active, created_at, last_fired_at, failure_count, secret")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  // Mask secrets — show only last 8 chars
  const safe = (webhooks ?? []).map((w: Record<string, unknown>) => ({
    ...w,
    secret: `••••••••${(w.secret as string).slice(-8)}`,
  }));

  return NextResponse.json({ webhooks: safe });
}

// ── POST — register ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // Check limit
  const { count } = await service
    .from("dev_webhooks")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id);

  if ((count ?? 0) >= MAX_WEBHOOKS_PER_USER) {
    return NextResponse.json({ error: `Max ${MAX_WEBHOOKS_PER_USER} webhooks allowed` }, { status: 409 });
  }

  const { url, events } = await req.json() as { url: string; events?: string[] };

  if (!url || !url.startsWith("https://")) {
    return NextResponse.json({ error: "URL must start with https://" }, { status: 400 });
  }

  const eventsToSave = (events ?? ["task.completed", "task.failed"])
    .filter((e) => ALLOWED_EVENTS.includes(e));

  if (eventsToSave.length === 0) {
    return NextResponse.json({ error: "At least one valid event required" }, { status: 400 });
  }

  const { data: webhook, error } = await service
    .from("dev_webhooks")
    .insert({ profile_id: user.id, url, events: eventsToSave })
    .select("id, url, events, secret, is_active, created_at")
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error || !webhook) {
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }

  return NextResponse.json({ webhook }, { status: 201 });
}

// ── DELETE — remove ─────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service
    .from("dev_webhooks")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  return NextResponse.json({ success: true });
}

// ── PATCH — update ───────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json() as { is_active?: boolean; url?: string; events?: string[] };
  const updates: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (body.url?.startsWith("https://"))    updates.url      = body.url;
  if (Array.isArray(body.events))          updates.events   = body.events.filter((e) => ALLOWED_EVENTS.includes(e));

  const service = createServiceClient();
  const { error } = await service
    .from("dev_webhooks")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  return NextResponse.json({ success: true });
}

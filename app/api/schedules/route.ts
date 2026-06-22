/**
 * Task Schedule Management API
 * GET    /api/schedules        — list user schedules
 * POST   /api/schedules        — create schedule
 * PATCH  /api/schedules?id=X   — update schedule
 * DELETE /api/schedules?id=X   — delete schedule
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";
import { computeNextRun } from "@/lib/schedule-utils";

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { data } = await service
    .from("task_schedules")
    .select(`
      id, name, goal, frequency, run_at_hour, run_at_dow, timezone,
      is_active, next_run_at, last_run_at, run_count, created_at,
      agents ( id, name, slug, price_per_task )
    `)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ schedules: data ?? [] });
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  // Max 20 schedules per user
  const { count } = await service
    .from("task_schedules")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id);
  if ((count ?? 0) >= 20) {
    return NextResponse.json({ error: "Maximum 20 schedules reached" }, { status: 409 });
  }

  const body = await req.json() as {
    agent_id: string;
    name?: string;
    goal: string;
    frequency: "hourly" | "daily" | "weekly" | "monthly";
    run_at_hour?: number;
    run_at_dow?: number;
    timezone?: string;
  };

  if (!body.agent_id || !body.goal?.trim() || !body.frequency) {
    return NextResponse.json({ error: "agent_id, goal, and frequency are required" }, { status: 400 });
  }

  // Verify agent belongs to platform
  const { data: agent } = await service
    .from("agents")
    .select("id, name")
    .eq("id", body.agent_id)
    .eq("is_active", true)
    .single() as { data: { id: string; name: string } | null };

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const next = computeNextRun(body.frequency, body.run_at_hour ?? 9, body.run_at_dow ?? 1);

  const { data: schedule, error } = await service
    .from("task_schedules")
    .insert({
      profile_id:  user.id,
      agent_id:    body.agent_id,
      name:        body.name ?? `${agent.name} — ${body.frequency}`,
      goal:        body.goal.trim(),
      frequency:   body.frequency,
      run_at_hour: body.run_at_hour ?? 9,
      run_at_dow:  body.run_at_dow ?? 1,
      timezone:    body.timezone ?? "UTC",
      next_run_at: next.toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  return NextResponse.json({ schedule }, { status: 201 });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json() as {
    is_active?: boolean;
    name?: string;
    goal?: string;
    frequency?: "hourly" | "daily" | "weekly" | "monthly";
    run_at_hour?: number;
    run_at_dow?: number;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.is_active === "boolean") updates.is_active  = body.is_active;
  if (body.name)        updates.name        = body.name;
  if (body.goal)        updates.goal        = body.goal;
  if (body.frequency)   updates.frequency   = body.frequency;
  if (body.run_at_hour !== undefined) updates.run_at_hour = body.run_at_hour;
  if (body.run_at_dow  !== undefined) updates.run_at_dow  = body.run_at_dow;

  if (body.frequency || body.run_at_hour !== undefined || body.run_at_dow !== undefined) {
    const { data: existing } = await service.from("task_schedules")
      .select("frequency, run_at_hour, run_at_dow").eq("id", id).single() as
      { data: { frequency: string; run_at_hour: number; run_at_dow: number } | null };
    if (existing) {
      const next = computeNextRun(
        (body.frequency ?? existing.frequency) as "daily" | "weekly" | "monthly",
        body.run_at_hour ?? existing.run_at_hour,
        body.run_at_dow  ?? existing.run_at_dow
      );
      updates.next_run_at = next.toISOString();
    }
  }

  const { error } = await service.from("task_schedules")
    .update(updates).eq("id", id).eq("profile_id", user.id);

  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  return NextResponse.json({ success: true });
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await service.from("task_schedules").delete().eq("id", id).eq("profile_id", user.id);
  return NextResponse.json({ success: true });
}

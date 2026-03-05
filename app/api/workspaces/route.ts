/**
 * Team Workspace API
 * GET    /api/workspaces         — list user's workspaces
 * POST   /api/workspaces         — create workspace
 * POST   /api/workspaces/invite  — invite member by email
 * DELETE /api/workspaces?id=X    — delete workspace (owner only)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // Workspaces the user owns
  const { data: owned } = await service
    .from("workspaces")
    .select("id, name, balance, slug, created_at")
    .eq("owner_id", user.id);

  // Workspaces the user is a member of (but doesn't own)
  const { data: memberOf } = await service
    .from("workspace_members")
    .select("role, joined_at, workspaces ( id, name, balance, slug )")
    .eq("profile_id", user.id);

  // For each workspace, get member count
  const allWorkspaceIds = [
    ...(owned ?? []).map((w) => w.id),
    ...(memberOf ?? []).map((m) => (m.workspaces as unknown as { id: string })?.id).filter(Boolean),
  ];

  const memberCounts: Record<string, number> = {};
  if (allWorkspaceIds.length > 0) {
    const { data: counts } = await service
      .from("workspace_members")
      .select("workspace_id")
      .in("workspace_id", allWorkspaceIds);
    (counts ?? []).forEach((c: { workspace_id: string }) => {
      memberCounts[c.workspace_id] = (memberCounts[c.workspace_id] ?? 0) + 1;
    });
  }

  return NextResponse.json({
    owned:    (owned ?? []).map((w) => ({ ...w, role: "owner",  memberCount: memberCounts[w.id] ?? 1 })),
    memberOf: (memberOf ?? []).map((m) => {
      const ws = m.workspaces as unknown as { id: string; name: string; balance: number; slug: string };
      return { ...ws, role: m.role, joined_at: m.joined_at, memberCount: memberCounts[ws?.id] ?? 1 };
    }),
  });
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { name } = await req.json() as { name: string };

  if (!name?.trim() || name.length > 50) {
    return NextResponse.json({ error: "Name must be 1–50 characters" }, { status: 400 });
  }

  // Limit: 3 workspaces per user
  const { count } = await service.from("workspaces")
    .select("id", { count: "exact", head: true }).eq("owner_id", user.id);
  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: "Max 3 workspaces per account" }, { status: 409 });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30)
    + "-" + Math.random().toString(36).slice(2, 6);

  const { data: ws, error } = await service
    .from("workspaces")
    .insert({ name: name.trim(), owner_id: user.id, slug })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });

  // Add owner as member
  await service.from("workspace_members").insert({
    workspace_id: ws.id,
    profile_id:   user.id,
    role:         "owner",
  });

  return NextResponse.json({ workspace: ws }, { status: 201 });
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const service = createServiceClient();
  await service.from("workspaces").delete().eq("id", id).eq("owner_id", user.id);
  return NextResponse.json({ success: true });
}

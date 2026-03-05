import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspace_id, email } = await req.json() as { workspace_id: string; email: string };
  if (!workspace_id || !email?.includes("@")) {
    return NextResponse.json({ error: "workspace_id and valid email required" }, { status: 400 });
  }

  const service = createServiceClient();

  // Verify inviter is owner/admin
  const { data: membership } = await service
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace_id)
    .eq("profile_id", user.id)
    .single() as { data: { role: string } | null };

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check member limit (max 10 per workspace)
  const { count } = await service
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace_id);
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "Workspace is full (max 10 members)" }, { status: 409 });
  }

  // Create invite
  const { data: invite, error } = await service
    .from("workspace_invites")
    .insert({ workspace_id, email: email.toLowerCase(), invited_by: user.id })
    .select("id, token, email, expires_at")
    .single() as { data: { id: string; token: string; email: string; expires_at: string } | null; error: unknown };

  if (error || !invite) {
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agents-dev-roan.vercel.app";
  const inviteUrl = `${BASE_URL}/workspace/join?token=${invite.token}`;

  return NextResponse.json({ success: true, inviteUrl, token: invite.token });
}

// Accept invite
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required to accept invite" }, { status: 401 });

  const service = createServiceClient();

  const { data: invite } = await service
    .from("workspace_invites")
    .select("id, workspace_id, email, expires_at, accepted_at")
    .eq("token", token)
    .single() as { data: { id: string; workspace_id: string; email: string; expires_at: string; accepted_at: string | null } | null };

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: "Invite already used" }, { status: 409 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 410 });

  // Add member
  await service.from("workspace_members").upsert({
    workspace_id: invite.workspace_id,
    profile_id:   user.id,
    role:         "member",
  }, { onConflict: "workspace_id,profile_id" });

  // Mark invite used
  await service.from("workspace_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ success: true, workspace_id: invite.workspace_id });
}

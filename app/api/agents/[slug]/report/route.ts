import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";

const REASONS = ["spam", "harmful", "misleading", "copyright", "other"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { slug } = await params;

  const { data: agent } = await service
    .from("agents")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = await req.json();
  const reason = body?.reason;
  const details = typeof body?.details === "string" ? body.details.trim().slice(0, 2000) : null;

  if (!reason || !REASONS.includes(reason)) {
    return NextResponse.json(
      { error: "Invalid reason. Use one of: " + REASONS.join(", ") },
      { status: 422 }
    );
  }

  const { error } = await service.from("agent_reports").insert({
    reporter_id: user.id,
    agent_id:   agent.id,
    reason,
    details:   details || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

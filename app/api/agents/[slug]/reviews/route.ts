import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { agentId, rating, comment } = await req.json();

  if (!agentId || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  // Verify user has completed a task with this agent
  const { data: task } = await service
    .from("tasks")
    .select("id")
    .eq("agent_id", agentId)
    .eq("client_id", user.id)
    .eq("status", "completed")
    .limit(1)
    .single();

  if (!task) {
    return NextResponse.json(
      { error: "You can only review agents you've used and completed a task with." },
      { status: 403 }
    );
  }

  const { error } = await service.from("reviews").upsert({
    agent_id:    agentId,
    reviewer_id: user.id,
    rating,
    comment:     comment?.trim() || null,
  }, { onConflict: "agent_id,reviewer_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await params; // consume params to avoid Next.js warning
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { task_id, is_public } = await req.json() as { task_id: string; is_public: boolean };
  if (!task_id) return NextResponse.json({ error: "Missing task_id" }, { status: 400 });

  // Verify ownership + completed status
  const { data: task } = await service
    .from("tasks")
    .select("id, client_id, status, result_text")
    .eq("id", task_id)
    .single() as { data: { id: string; client_id: string; status: string; result_text: string } | null };

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.client_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (task.status !== "completed") return NextResponse.json({ error: "Only completed tasks can be published" }, { status: 409 });

  // Generate a short summary for the gallery preview
  const summary = task.result_text
    ? task.result_text.slice(0, 300).replace(/\n+/g, " ").trim()
    : null;

  await service.from("tasks").update({
    is_public:      is_public,
    result_summary: is_public ? summary : null,
  }).eq("id", task_id);

  return NextResponse.json({ success: true, is_public });
}

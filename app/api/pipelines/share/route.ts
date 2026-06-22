import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";
import { creditMatadoraWallet } from "@/lib/matadora-helpers";

// POST /api/pipelines/share — toggle public sharing on a pipeline
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { pipeline_id, is_public } = await req.json() as { pipeline_id: string; is_public: boolean };

  // Verify ownership
  const { data: pl } = await service
    .from("pipelines")
    .select("id, share_token, owner_id")
    .eq("id", pipeline_id)
    .single() as { data: { id: string; share_token: string | null; owner_id: string } | null };

  if (!pl || pl.owner_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://matadora.business";

  // Generate share_token if not exists
  if (!pl.share_token) {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    await service.from("pipelines").update({ share_token: token, is_public }).eq("id", pipeline_id);
    return NextResponse.json({ is_public, shareUrl: `${BASE}/p/${token}` });
  }

  await service.from("pipelines").update({ is_public }).eq("id", pipeline_id);
  return NextResponse.json({ is_public, shareUrl: `${BASE}/p/${pl.share_token}` });
}

// POST /api/pipelines/fork — fork a shared pipeline
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { token } = await req.json() as { token: string };

  const { data: original } = await service
    .from("pipelines")
    .select("id, name, description, steps")
    .eq("share_token", token)
    .eq("is_public", true)
    .single() as { data: { id: string; name: string; description: string; steps: unknown } | null };

  if (!original) return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });

  // Create a fork for this user
  const { data: fork, error } = await service
    .from("pipelines")
    .insert({
      owner_id:       user.id,
      name:           `${original.name} (fork)`,
      description:    original.description,
      steps:          original.steps,
      forked_from_id: original.id,
    })
    .select("id")
    .single();

  if (error || !fork) return NextResponse.json({ error: "Failed to fork" }, { status: 500 });

  // Increment fork count on original
  try { await service.rpc("increment", { table: "pipelines", column: "fork_count", id: original.id }); } catch { /* non-critical */ }

  // Award MATADORA to original creator (referral reward)
  try {
    const { data: original2 } = await service.from("pipelines").select("owner_id").eq("id", original.id).single() as { data: { owner_id: string } | null };
    if (original2?.owner_id) {
      await creditMatadoraWallet(service, original2.owner_id, 10, "creator_royalty", "Pipeline fork royalty", fork.id);
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ fork_id: fork.id }, { status: 201 });
}

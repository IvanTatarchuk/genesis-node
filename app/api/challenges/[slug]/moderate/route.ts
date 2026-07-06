import { NextResponse } from "next/server";

import { moderateChallenge } from "@/lib/supabase";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface ModerateBody {
  action?: "approve" | "reject";
}

/**
 * Approves or rejects a pending player-authored challenge. There is no
 * moderator account system — this is gated by a single shared secret
 * (ADMIN_SECRET) sent as the x-admin-secret header, the simplest thing that
 * lets a submission ever leave 'pending' and become visible/runnable by
 * players other than its author.
 */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("x-admin-secret") !== adminSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ModerateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
  }

  const { slug } = await params;
  const status = body.action === "approve" ? "approved" : "rejected";

  try {
    await moderateChallenge(slug, status);
    return NextResponse.json({ slug, status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

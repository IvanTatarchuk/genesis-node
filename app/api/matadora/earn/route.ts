import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase-server";
import { creditMatadoraWallet } from "@/lib/matadora-helpers";

/**
 * POST /api/matadora/earn — award MATADORA for completed tasks (called by cron/orchestrator).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const authErr = verifyCronSecret(req);
  if (authErr) return authErr;

  const body = await req.json() as {
    profile_id: string;
    amount: number;
    reason: string;
    reference_id?: string;
  };

  const { profile_id, amount, reason, reference_id } = body;
  if (!profile_id || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "profile_id and positive amount required" }, { status: 422 });
  }

  const service = createServiceClient();

  await creditMatadoraWallet(service, profile_id, amount, "earn", reason, reference_id);

  return NextResponse.json({ success: true, credited: amount });
}

import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/** GET /api/donate/balance — Current user balance (for donate UI) */
export async function GET() {
  const sb = await createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .single() as { data: { balance: number } | null };

  return NextResponse.json({ balance: data?.balance ?? 0 });
}

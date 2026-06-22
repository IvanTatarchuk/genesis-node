import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";

/** GET /api/donate/balance — Current user balance (for donate UI) */
export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { data } = await service
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .single() as { data: { balance: number } | null };

  return NextResponse.json({ balance: data?.balance ?? 0 });
}

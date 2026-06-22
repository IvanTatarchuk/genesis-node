import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  // Ensure wallet exists
  await service.from("matadora_wallets").upsert(
    { profile_id: user.id, balance: 0 },
    { onConflict: "profile_id", ignoreDuplicates: true },
  );

  const [walletRes, txnRes] = await Promise.all([
    service.from("matadora_wallets").select("*").eq("profile_id", user.id).single(),
    service.from("matadora_transactions").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);

  return NextResponse.json({
    wallet:       walletRes.data ?? { balance: 0, total_earned: 0, total_spent: 0 },
    transactions: txnRes.data   ?? [],
  });
}

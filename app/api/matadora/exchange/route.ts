import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";
import { rateLimit, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";

const MATADORA_TO_CREDIT = 10;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const rl = rateLimit(`matadora-exchange:${user.id}`, GENERAL_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { amount } = await req.json() as { amount: number };
  if (!amount || amount < 1) {
    return NextResponse.json({ error: "Amount must be at least 1" }, { status: 422 });
  }

  // Fetch wallet
  const { data: wallet } = await service
    .from("matadora_wallets")
    .select("balance, total_exchanged")
    .eq("profile_id", user.id)
    .single() as { data: { balance: number; total_exchanged: number } | null };

  if (!wallet || wallet.balance < amount) {
    return NextResponse.json({ error: "Insufficient MATADORA balance", balance: wallet?.balance ?? 0 }, { status: 402 });
  }

  const creditsEarned = amount * MATADORA_TO_CREDIT;

  // Debit MATADORA
  await service.from("matadora_wallets").update({
    balance: wallet.balance - amount,
    total_exchanged: (wallet.total_exchanged ?? 0) + amount,
    updated_at: new Date().toISOString(),
  }).eq("profile_id", user.id);

  // Log MATADORA transaction
  await service.from("matadora_transactions").insert({
    profile_id: user.id,
    amount: -amount,
    type: "exchange",
    description: `Exchanged ${amount} MATADORA for ${creditsEarned} credits`,
  });

  // Credit account
  const { data: profile } = await service.from("profiles").select("balance").eq("id", user.id).single() as { data: { balance: number } | null };
  await service.from("profiles").update({ balance: (profile?.balance ?? 0) + creditsEarned }).eq("id", user.id);
  await service.from("credit_transactions").insert({
    profile_id: user.id,
    amount: creditsEarned,
    type: "matadora_exchange",
    description: `Exchanged ${amount} MATADORA`,
  });

  return NextResponse.json({ success: true, matadora_spent: amount, credits_earned: creditsEarned });
}

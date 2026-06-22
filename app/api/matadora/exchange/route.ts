import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** Minimum exchange: 1000 MATADORA = $10 */
const MIN_EXCHANGE = 1000;
const MAX_EXCHANGE_PER_DAY = 100_000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const rl = rateLimit(`mat-exchange:${ip}`, { limit: 5, windowSec: 3600 });
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount } = await req.json() as { amount: number };
  if (!amount || amount < MIN_EXCHANGE) {
    return NextResponse.json({ error: `Minimum exchange is ${MIN_EXCHANGE} MATADORA` }, { status: 400 });
  }

  const service = createServiceClient();

  // Get current market rate
  const { data: rateRow } = await service
    .from("matadora_market_rates")
    .select("rate_usd")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const rateUsd: number = (rateRow as { rate_usd: number } | null)?.rate_usd ?? 0.01;
  const usdAmount = parseFloat((amount * rateUsd).toFixed(2));

  // Check wallet balance
  const { data: wallet } = await service
    .from("matadora_wallets")
    .select("balance")
    .eq("profile_id", user.id)
    .single() as { data: { balance: number } | null };

  if (!wallet || wallet.balance < amount) {
    return NextResponse.json({ error: "Insufficient MATADORA balance" }, { status: 400 });
  }

  // Check daily limit
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { data: todayExchanges } = await service
    .from("matadora_exchange_orders")
    .select("matadora_amount")
    .eq("profile_id", user.id)
    .gte("created_at", since);

  const todayTotal = (todayExchanges ?? []).reduce((s, r: { matadora_amount: number }) => s + r.matadora_amount, 0);
  if (todayTotal + amount > MAX_EXCHANGE_PER_DAY) {
    return NextResponse.json({ error: `Daily exchange limit is ${MAX_EXCHANGE_PER_DAY.toLocaleString()} MATADORA` }, { status: 400 });
  }

  // Create exchange order (pending Stripe payout)
  const { data: order } = await service
    .from("matadora_exchange_orders")
    .insert({
      profile_id:      user.id,
      matadora_amount: amount,
      usd_amount:      usdAmount,
      rate:            rateUsd,
      status:          "pending",
    })
    .select("id")
    .single();

  if (!order) return NextResponse.json({ error: "Failed to create order" }, { status: 500 });

  // Deduct from wallet
  const { error: walletErr } = await service.from("matadora_wallets")
    .update({
      balance:         wallet.balance - amount,
      total_exchanged: (wallet as unknown as { total_exchanged?: number }).total_exchanged ?? 0 + amount,
      updated_at:      new Date().toISOString(),
    })
    .eq("profile_id", user.id);
  if (walletErr) {
    console.error("[POST /api/matadora/exchange] wallet debit failed:", walletErr);
    return NextResponse.json({ error: "Failed to debit wallet" }, { status: 500 });
  }

  // Log transaction
  const { error: txnErr } = await service.from("matadora_transactions").insert({
    profile_id:   user.id,
    amount:       -amount,
    type:         "exchanged",
    description:  `Exchange ${amount.toLocaleString()} MATADORA → $${usdAmount} USD`,
    reference_id: order.id,
    rate_usd:     rateUsd,
  });
  if (txnErr) {
    console.error("[POST /api/matadora/exchange] transaction log failed:", txnErr);
  }

  return NextResponse.json({
    order_id:        order.id,
    matadora_amount: amount,
    usd_amount:      usdAmount,
    rate:            rateUsd,
    status:          "pending",
    note:            "Your exchange will be processed within 1-3 business days. We'll email you when complete.",
  });
}

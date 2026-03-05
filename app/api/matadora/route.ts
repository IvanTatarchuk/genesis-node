/**
 * MATADORA API — wallet, transactions, exchange
 * GET  /api/matadora           → wallet + recent transactions + market rate
 * POST /api/matadora/earn      → award MATADORA for actions
 * POST /api/matadora/exchange  → request exchange MATADORA → USD
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { rateLimit, GENERAL_RATE_LIMIT, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // Get or create wallet
  let { data: wallet } = await service
    .from("matadora_wallets")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  if (!wallet) {
    const { data: created } = await service
      .from("matadora_wallets")
      .insert({ profile_id: user.id, balance: 0 })
      .select("*")
      .single();
    wallet = created;
  }

  // Recent transactions
  const { data: transactions } = await service
    .from("matadora_transactions")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Current market rate
  const { data: rate } = await service
    .from("matadora_market_rates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ wallet, transactions: transactions ?? [], rate });
}

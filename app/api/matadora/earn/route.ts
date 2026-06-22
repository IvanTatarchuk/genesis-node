/**
 * Internal endpoint to award MATADORA to users for various actions
 * Called server-side only (via service key)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

const EARN_RULES: Record<string, number> = {
  task_completed:     5,    // Complete a task
  daily_login:       10,    // Log in daily
  streak_3:          25,    // 3-day streak
  streak_7:          100,   // 7-day streak
  first_task:        50,    // First ever task
  referral_signup:   200,   // Referred user signed up
  agent_published:   500,   // Developer published first agent
  task_review:        2,    // Leave a task review
  pipeline_fork:     10,    // Someone forked your pipeline (creator_royalty)
  top_10_weekly:    1000,   // Top 10 on leaderboard weekly
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify internal call via service secret
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.SERVICE_ROLE_KEY}` && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profile_id, action, reference_id } = await req.json() as {
    profile_id: string;
    action: keyof typeof EARN_RULES;
    reference_id?: string;
  };

  const amount = EARN_RULES[action];
  if (!amount) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const service = createServiceClient();

  // Idempotency: skip if already awarded for this reference
  if (reference_id) {
    const { data: existing } = await service
      .from("matadora_transactions")
      .select("id")
      .eq("profile_id", profile_id)
      .eq("reference_id", reference_id)
      .eq("type", "earned")
      .maybeSingle();
    if (existing) return NextResponse.json({ skipped: true });
  }

  // Ensure wallet exists
  await service.from("matadora_wallets").upsert(
    { profile_id, balance: 0 },
    { onConflict: "profile_id", ignoreDuplicates: true }
  );

  // Get current balance
  const { data: wallet } = await service
    .from("matadora_wallets")
    .select("balance, total_earned")
    .eq("profile_id", profile_id)
    .single() as { data: { balance: number; total_earned: number } | null };

  // Update wallet
  await service.from("matadora_wallets").update({
    balance:     (wallet?.balance ?? 0) + amount,
    total_earned: (wallet?.total_earned ?? 0) + amount,
    updated_at:  new Date().toISOString(),
  }).eq("profile_id", profile_id);

  // Log transaction
  await service.from("matadora_transactions").insert({
    profile_id,
    amount,
    type:         "earned",
    description:  `Earned for: ${action.replace(/_/g, " ")}`,
    reference_id: reference_id ?? null,
  });

  return NextResponse.json({ earned: amount, action });
}


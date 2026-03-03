import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // Parallel fetch: daily revenue (last 30 days) + per-agent stats + profile
  const [
    { data: dailyRevenue },
    { data: agentStats },
    { data: profile },
  ] = await Promise.all([
    service
      .from("developer_daily_revenue")
      .select("day, credits_earned, transactions")
      .eq("developer_id", user.id)
      .order("day", { ascending: true })
      .limit(30),
    service
      .from("agent_analytics")
      .select("*")
      .eq("creator_id", user.id),
    service
      .from("profiles")
      .select("total_earned_credits, total_paid_out_credits, dev_level, current_streak, balance")
      .eq("id", user.id)
      .single(),
  ]);

  // Build last 30 days scaffold (fill gaps with 0)
  const today = new Date();
  const days30: { day: string; credits: number; txns: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = (dailyRevenue ?? []).find((r: { day: string; credits_earned: number; transactions: number }) => r.day === key);
    days30.push({
      day:     key,
      credits: found ? Number(found.credits_earned) : 0,
      txns:    found ? Number(found.transactions)   : 0,
    });
  }

  const totalLast30 = days30.reduce((sum, d) => sum + d.credits, 0);
  const totalLast7  = days30.slice(-7).reduce((sum, d) => sum + d.credits, 0);

  return NextResponse.json({
    profile:     profile ?? {},
    dailyRevenue: days30,
    agentStats:  agentStats ?? [],
    summary: {
      totalLast30,
      totalLast7,
      totalAllTime:   profile?.total_earned_credits ?? 0,
      pendingPayout:  profile?.total_paid_out_credits ?? 0,
      devLevel:       profile?.dev_level ?? "starter",
      totalAgents:    (agentStats ?? []).length,
      totalTasksDone: (agentStats ?? []).reduce((s: number, a: { total_tasks_completed: number }) => s + (a.total_tasks_completed ?? 0), 0),
    },
  });
}

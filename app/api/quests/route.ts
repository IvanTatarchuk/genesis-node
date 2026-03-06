/**
 * GET  /api/quests  — list quests + user progress for today/this week
 * POST /api/quests/claim — claim reward for completed quest
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

function getPeriodKey(resetType: string): string {
  const now = new Date();
  if (resetType === "daily")  return now.toISOString().split("T")[0];
  if (resetType === "weekly") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return `week-${start.toISOString().split("T")[0]}`;
  }
  return "once";
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: allQuests } = await service.from("quests").select("*").eq("is_active", true);

  // For each quest, get current period user progress
  const periods = [...new Set((allQuests ?? []).map((q: { reset_type: string }) => getPeriodKey(q.reset_type)))];
  const { data: userProgress } = await service
    .from("user_quests")
    .select("*")
    .eq("profile_id", user.id)
    .in("period_key", periods);

  const progressMap = new Map((userProgress ?? []).map((uq: { quest_id: string; period_key: string; progress: number; completed_at: string | null; claimed_at: string | null }) => [`${uq.quest_id}:${uq.period_key}`, uq]));

  const quests = (allQuests ?? []).map((q: { id: string; title: string; description: string; reward_matadora: number; target_count: number; reset_type: string; icon: string }) => {
    const periodKey = getPeriodKey(q.reset_type);
    const up = progressMap.get(`${q.id}:${periodKey}`);
    return {
      ...q,
      period_key:   periodKey,
      progress:     up?.progress ?? 0,
      completed_at: up?.completed_at ?? null,
      claimed_at:   up?.claimed_at ?? null,
    };
  });

  return NextResponse.json({ quests });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quest_id } = await req.json() as { quest_id: string };
  const service = createServiceClient();

  const { data: quest } = await service.from("quests").select("*").eq("id", quest_id).single() as { data: { reward_matadora: number; target_count: number; reset_type: string } | null };
  if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  const periodKey = getPeriodKey(quest.reset_type);
  const { data: uq } = await service.from("user_quests").select("*").eq("profile_id", user.id).eq("quest_id", quest_id).eq("period_key", periodKey).single() as { data: { progress: number; completed_at: string | null; claimed_at: string | null } | null };

  if (!uq?.completed_at) return NextResponse.json({ error: "Quest not completed" }, { status: 400 });
  if (uq.claimed_at) return NextResponse.json({ error: "Already claimed" }, { status: 400 });

  // Mark as claimed
  await service.from("user_quests").update({ claimed_at: new Date().toISOString() }).eq("profile_id", user.id).eq("quest_id", quest_id).eq("period_key", periodKey);

  // Award MATADORA
  const { data: wallet } = await service.from("matadora_wallets").select("balance,total_earned").eq("profile_id", user.id).single() as { data: { balance: number; total_earned: number } | null };
  await service.from("matadora_wallets").upsert({ profile_id: user.id, balance: (wallet?.balance ?? 0) + quest.reward_matadora, total_earned: (wallet?.total_earned ?? 0) + quest.reward_matadora, updated_at: new Date().toISOString() }, { onConflict: "profile_id" });
  await service.from("matadora_transactions").insert({ profile_id: user.id, amount: quest.reward_matadora, type: "bonus", description: `Quest reward: ${quest_id}`, reference_id: `quest:${quest_id}:${periodKey}` });

  return NextResponse.json({ claimed: true, reward: quest.reward_matadora });
}

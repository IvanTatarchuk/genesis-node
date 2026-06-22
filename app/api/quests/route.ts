import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";
import { creditMatadoraWallet } from "@/lib/matadora-helpers";

// GET — list all quests with user progress
export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const [{ data: quests }, { data: userQuests }] = await Promise.all([
    service.from("quests").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    service.from("user_quests").select("*").eq("profile_id", user.id),
  ]);

  const claimedSet = new Set((userQuests ?? []).map((uq: { quest_id: string }) => uq.quest_id));
  const progressMap = new Map((userQuests ?? []).map((uq: { quest_id: string; progress: number }) => [uq.quest_id, uq.progress]));

  const enriched = (quests ?? []).map((q: { id: string; target: number; reward_credits: number; reward_matadora: number }) => ({
    ...q,
    progress: progressMap.get(q.id) ?? 0,
    claimed: claimedSet.has(q.id),
  }));

  return NextResponse.json({ quests: enriched });
}

// POST — claim a completed quest
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { quest_id } = await req.json() as { quest_id: string };
  if (!quest_id) return NextResponse.json({ error: "quest_id required" }, { status: 422 });

  // Fetch quest
  const { data: quest } = await service
    .from("quests").select("*").eq("id", quest_id).eq("is_active", true).single() as
    { data: { id: string; target: number; reward_credits: number; reward_matadora: number; title: string } | null };
  if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  // Check progress
  const { data: uq } = await service
    .from("user_quests").select("*").eq("profile_id", user.id).eq("quest_id", quest_id).single() as
    { data: { progress: number; claimed_at: string | null } | null };

  if (uq?.claimed_at) return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  if ((uq?.progress ?? 0) < quest.target) return NextResponse.json({ error: "Quest not completed" }, { status: 422 });

  // Award credits
  if (quest.reward_credits > 0) {
    const { data: profile } = await service.from("profiles").select("balance").eq("id", user.id).single() as { data: { balance: number } | null };
    await service.from("profiles").update({ balance: (profile?.balance ?? 0) + quest.reward_credits }).eq("id", user.id);
    await service.from("credit_transactions").insert({
      profile_id: user.id,
      amount: quest.reward_credits,
      type: "quest_reward",
      description: `Quest reward: ${quest.title}`,
      reference_id: quest.id,
    });
  }

  // Award MATADORA
  if (quest.reward_matadora > 0) {
    await creditMatadoraWallet(service, user.id, quest.reward_matadora, "quest_reward", `Quest: ${quest.title}`, quest.id);
  }

  // Mark claimed
  await service.from("user_quests").upsert(
    { profile_id: user.id, quest_id, claimed_at: new Date().toISOString() },
    { onConflict: "profile_id,quest_id" },
  );

  return NextResponse.json({ success: true, credits: quest.reward_credits, matadora: quest.reward_matadora });
}

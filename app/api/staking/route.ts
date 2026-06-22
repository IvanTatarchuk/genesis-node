/**
 * GET  /api/staking  — list stakes
 * POST /api/staking  — create new stake
 * PUT  /api/staking  — claim completed stake
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";

const APY: Record<number, number> = { 30: 5, 60: 10, 90: 15 };

export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { data: stakes } = await service.from("matadora_stakes").select("*").eq("profile_id", user.id).order("created_at", { ascending: false });
  const { data: wallet } = await service.from("matadora_wallets").select("balance").eq("profile_id", user.id).single() as { data: { balance: number } | null };

  // Auto-complete expired stakes
  const now = new Date().toISOString();
  const completed = (stakes ?? []).filter((s: { status: string; ends_at: string }) => s.status === "active" && s.ends_at <= now);
  for (const s of completed as Array<{ id: string; amount: number; apy: number; duration_days: number }>) {
    const reward = Math.floor(s.amount * (s.apy / 100) * (s.duration_days / 365));
    await service.from("matadora_stakes").update({ status: "completed", reward_earned: reward }).eq("id", s.id);
  }

  const { data: freshStakes } = await service.from("matadora_stakes").select("*").eq("profile_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ stakes: freshStakes, balance: wallet?.balance ?? 0, apy_table: APY });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { amount, duration_days } = await req.json() as { amount: number; duration_days: number };
  if (!amount || amount < 100) return NextResponse.json({ error: "Minimum stake is 100 MATADORA" }, { status: 400 });
  if (!APY[duration_days]) return NextResponse.json({ error: "Duration must be 30, 60, or 90 days" }, { status: 400 });

  const { data: wallet } = await service.from("matadora_wallets").select("balance, total_spent").eq("profile_id", user.id).single() as { data: { balance: number; total_spent: number } | null };
  if (!wallet || wallet.balance < amount) return NextResponse.json({ error: "Insufficient MATADORA balance" }, { status: 400 });

  const endsAt = new Date(Date.now() + duration_days * 86400_000).toISOString();
  const { data: stake, error } = await service.from("matadora_stakes").insert({
    profile_id: user.id, amount, duration_days,
    apy: APY[duration_days], ends_at: endsAt,
  }).select("id").single();

  if (error || !stake) return NextResponse.json({ error: "Failed to create stake" }, { status: 500 });

  await service.from("matadora_wallets").update({
    balance:     wallet.balance - amount,
    total_spent: (wallet.total_spent ?? 0) + amount,
    updated_at:  new Date().toISOString(),
  }).eq("profile_id", user.id);
  await service.from("matadora_transactions").insert({ profile_id: user.id, amount: -amount, type: "spent", description: `Staked ${amount} MATADORA for ${duration_days} days`, reference_id: (stake as { id: string }).id });

  return NextResponse.json({ stake_id: (stake as { id: string }).id, ends_at: endsAt, apy: APY[duration_days] }, { status: 201 });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { stake_id } = await req.json() as { stake_id: string };

  const { data: stake } = await service.from("matadora_stakes").select("*").eq("id", stake_id).eq("profile_id", user.id).single() as { data: { id: string; amount: number; apy: number; duration_days: number; status: string; ends_at: string; reward_earned: number } | null };
  if (!stake) return NextResponse.json({ error: "Stake not found" }, { status: 404 });
  if (stake.status !== "completed") return NextResponse.json({ error: "Stake not completed yet" }, { status: 400 });

  const total = stake.amount + stake.reward_earned;
  const { data: wallet } = await service.from("matadora_wallets").select("balance, total_earned").eq("profile_id", user.id).single() as { data: { balance: number; total_earned: number } | null };
  await service.from("matadora_wallets").update({ balance: (wallet?.balance ?? 0) + total, total_earned: (wallet?.total_earned ?? 0) + stake.reward_earned, updated_at: new Date().toISOString() }).eq("profile_id", user.id);
  await service.from("matadora_stakes").update({ status: "completed" }).eq("id", stake_id);
  await service.from("matadora_transactions").insert({ profile_id: user.id, amount: total, type: "earned", description: `Stake matured: ${stake.amount} + ${stake.reward_earned} reward`, reference_id: stake_id });

  return NextResponse.json({ claimed: true, principal: stake.amount, reward: stake.reward_earned, total });
}

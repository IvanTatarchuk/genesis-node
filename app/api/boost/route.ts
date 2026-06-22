import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";

const BOOST_PLANS = {
  "1d":  { credits: 50,  days: 1,  label: "1 день" },
  "3d":  { credits: 120, days: 3,  label: "3 дні" },
  "7d":  { credits: 250, days: 7,  label: "7 днів" },
  "30d": { credits: 800, days: 30, label: "30 днів" },
} as const;

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, supabase, service } = auth;

  const { agentSlug, plan } = await req.json();
  const boost = BOOST_PLANS[plan as keyof typeof BOOST_PLANS];
  if (!agentSlug || !boost) {
    return NextResponse.json({ error: "Invalid plan or agent" }, { status: 400 });
  }

  // Verify agent belongs to user
  const { data: agent } = await supabase
    .from("agents")
    .select("id, creator_id")
    .eq("slug", agentSlug)
    .single() as { data: { id: string; creator_id: string } | null };

  if (!agent || agent.creator_id !== user.id) {
    return NextResponse.json({ error: "Agent not found or not yours" }, { status: 403 });
  }

  // Check balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .single() as { data: { balance: number } | null };

  if (!profile || profile.balance < boost.credits) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const boostUntil = new Date();
  boostUntil.setDate(boostUntil.getDate() + boost.days);

  // Deduct credits and activate boost
  await service.from("profiles").update({ balance: profile.balance - boost.credits }).eq("id", user.id);
  await service.from("agents").update({
    is_boosted: true,
    boost_ends_at: boostUntil.toISOString(),
    is_featured: true,
  }).eq("id", agent.id);

  // Credit transaction log
  await service.from("credit_transactions").insert({
    user_id: user.id,
    amount: -boost.credits,
    type: "boost",
    description: `Boost агента @${agentSlug} на ${boost.label}`,
  });

  return NextResponse.json({ ok: true, boostUntil });
}

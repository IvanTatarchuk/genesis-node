import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

const BOOST_PLANS = {
  "1d":  { credits: 50,  days: 1,  label: "1 день" },
  "3d":  { credits: 120, days: 3,  label: "3 дні" },
  "7d":  { credits: 250, days: 7,  label: "7 днів" },
  "30d": { credits: 800, days: 30, label: "30 днів" },
} as const;

export async function POST(req: NextRequest) {
  const sb = await createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentSlug, plan } = await req.json();
  const boost = BOOST_PLANS[plan as keyof typeof BOOST_PLANS];
  if (!agentSlug || !boost) {
    return NextResponse.json({ error: "Invalid plan or agent" }, { status: 400 });
  }

  // Verify agent belongs to user
  const { data: agent } = await sb
    .from("agents")
    .select("id, creator_id")
    .eq("slug", agentSlug)
    .single() as { data: { id: string; creator_id: string } | null };

  if (!agent || agent.creator_id !== user.id) {
    return NextResponse.json({ error: "Agent not found or not yours" }, { status: 403 });
  }

  // Check balance
  const { data: profile } = await sb
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
  const sba = sb as ReturnType<typeof createServiceClient>;
  const { error: debitErr } = await sba.from("profiles").update({ balance: profile.balance - boost.credits }).eq("id", user.id);
  if (debitErr) {
    console.error("[POST /api/boost] balance debit failed:", debitErr);
    return NextResponse.json({ error: "Failed to debit credits" }, { status: 500 });
  }

  const { error: boostErr } = await sba.from("agents").update({
    is_boosted: true,
    boost_ends_at: boostUntil.toISOString(),
    is_featured: true,
  }).eq("id", agent.id);
  if (boostErr) {
    console.error("[POST /api/boost] agent boost update failed:", boostErr);
    return NextResponse.json({ error: "Failed to activate boost" }, { status: 500 });
  }

  // Credit transaction log
  const { error: txnErr } = await sba.from("credit_transactions").insert({
    user_id: user.id,
    amount: -boost.credits,
    type: "boost",
    description: `Boost агента @${agentSlug} на ${boost.label}`,
  });
  if (txnErr) {
    console.error("[POST /api/boost] transaction log failed:", txnErr);
  }

  return NextResponse.json({ ok: true, boostUntil });
}

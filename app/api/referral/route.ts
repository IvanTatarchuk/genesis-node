/**
 * GET  /api/referral  — get referral code + stats
 * POST /api/referral  — register referral when new user signs up with ref code
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service.from("profiles").select("referral_code").eq("id", user.id).single() as { data: { referral_code: string | null } | null };

  let code = profile?.referral_code;
  if (!code) {
    code = Math.random().toString(36).slice(2, 10).toUpperCase();
    await service.from("profiles").update({ referral_code: code }).eq("id", user.id);
  }

  const { data: referrals, count } = await service
    .from("referrals")
    .select("created_at, matadora_rewarded", { count: "exact" })
    .eq("referrer_id", user.id);

  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agents-dev-roan.vercel.app";
  return NextResponse.json({
    code,
    referral_url:    `${BASE}/login?ref=${code}`,
    total_referrals: count ?? 0,
    rewarded:        (referrals ?? []).filter((r: { matadora_rewarded: boolean }) => r.matadora_rewarded).length,
    recent:          (referrals ?? []).slice(0, 5),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { ref_code, new_user_id } = await req.json() as { ref_code: string; new_user_id: string };
  if (!ref_code || !new_user_id) return NextResponse.json({ ok: false });

  const service = createServiceClient();
  const { data: referrer } = await service.from("profiles").select("id").eq("referral_code", ref_code).single() as { data: { id: string } | null };
  if (!referrer || referrer.id === new_user_id) return NextResponse.json({ ok: false });

  await service.from("profiles").update({ referred_by: referrer.id }).eq("id", new_user_id);
  const { error } = await service.from("referrals").insert({ referrer_id: referrer.id, referred_id: new_user_id });
  if (error) return NextResponse.json({ ok: false });

  const { data: wallet } = await service.from("matadora_wallets").select("balance,total_earned").eq("profile_id", referrer.id).single() as { data: { balance: number; total_earned: number } | null };
  await service.from("matadora_wallets").upsert({ profile_id: referrer.id, balance: (wallet?.balance ?? 0) + 200, total_earned: (wallet?.total_earned ?? 0) + 200, updated_at: new Date().toISOString() }, { onConflict: "profile_id" });
  await service.from("matadora_transactions").insert({ profile_id: referrer.id, amount: 200, type: "referral", description: "Referral signup bonus", reference_id: new_user_id });
  await service.from("referrals").update({ matadora_rewarded: true }).eq("referrer_id", referrer.id).eq("referred_id", new_user_id);

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";
import { creditMatadoraWallet } from "@/lib/matadora-helpers";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  // Get or create referral code
  const { data: profile } = await service
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single() as { data: { referral_code: string | null } | null };

  let code = profile?.referral_code;
  if (!code) {
    code = crypto.randomUUID().slice(0, 8).toUpperCase();
    await service.from("profiles").update({ referral_code: code }).eq("id", user.id);
  }

  // Count referrals
  const { count } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("referred_by", user.id);

  return NextResponse.json({ code, referral_count: count ?? 0 });
}

export async function POST(): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  // Check if user was referred and hasn't been rewarded yet
  const { data: profile } = await service
    .from("profiles")
    .select("referred_by, referral_rewarded")
    .eq("id", user.id)
    .single() as { data: { referred_by: string | null; referral_rewarded: boolean | null } | null };

  if (!profile?.referred_by) {
    return NextResponse.json({ error: "No referral code applied" }, { status: 422 });
  }
  if (profile.referral_rewarded) {
    return NextResponse.json({ error: "Referral reward already claimed" }, { status: 409 });
  }

  // Award both parties MATADORA
  await Promise.all([
    creditMatadoraWallet(service, user.id, 200, "referral_bonus", "Referral signup bonus"),
    creditMatadoraWallet(service, profile.referred_by, 200, "referral_bonus", "Referral reward"),
  ]);

  // Mark as rewarded
  await service.from("profiles").update({ referral_rewarded: true }).eq("id", user.id);

  return NextResponse.json({ success: true, matadora_earned: 200 });
}

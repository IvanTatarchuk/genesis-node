import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-server";

/**
 * Supabase OAuth callback handler.
 * Exchanges the ?code= for a session, applies referral if ref= present, then redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const refCode = searchParams.get("ref")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Apply referral if ref code present and user just signed in
  if (refCode && user?.id) {
    try {
      const service = createServiceClient();
      const { data: referrer } = await service.from("profiles").select("id").eq("referral_code", refCode).single() as { data: { id: string } | null };
      if (referrer && referrer.id !== user.id) {
        await service.from("profiles").update({ referred_by: referrer.id }).eq("id", user.id);
        await service.from("referrals").insert({ referrer_id: referrer.id, referred_id: user.id });
        const { data: wallet } = await service.from("matadora_wallets").select("balance,total_earned").eq("profile_id", referrer.id).single() as { data: { balance: number; total_earned: number } | null };
        await service.from("matadora_wallets").upsert({ profile_id: referrer.id, balance: (wallet?.balance ?? 0) + 200, total_earned: (wallet?.total_earned ?? 0) + 200, updated_at: new Date().toISOString() }, { onConflict: "profile_id" });
        await service.from("matadora_transactions").insert({ profile_id: referrer.id, amount: 200, type: "referral", description: "Referral signup bonus", reference_id: user.id });
        await service.from("referrals").update({ matadora_rewarded: true }).eq("referrer_id", referrer.id).eq("referred_id", user.id);
      }
    } catch (e) {
      console.error("[auth/callback] referral apply failed", e);
    }
  }

  const redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/dashboard`;
  return NextResponse.redirect(redirectTo);
}

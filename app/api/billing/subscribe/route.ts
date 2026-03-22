import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/database.types";

// Map tier → Stripe Price env var name
// Set these in your .env and Vercel dashboard after creating products in Stripe
const PRICE_ENV: Record<string, string> = {
  starter_monthly: "STRIPE_PRICE_STARTER_MONTHLY",
  starter_annual:  "STRIPE_PRICE_STARTER_ANNUAL",
  pro_monthly:     "STRIPE_PRICE_PRO_MONTHLY",
  pro_annual:      "STRIPE_PRICE_PRO_ANNUAL",
  agency_monthly:  "STRIPE_PRICE_AGENCY_MONTHLY",
  agency_annual:   "STRIPE_PRICE_AGENCY_ANNUAL",
};

// Fallback: create a one-time price on the fly if Stripe Price IDs aren't set yet
// (3× previous prices; credits unchanged)
const PLAN_PRICES_CENTS: Record<string, { monthly: number; annual: number; credits: number }> = {
  starter: { monthly: 5700,  annual: 4500,  credits: 2000 },
  pro:     { monthly: 14700, annual: 11700, credits: 6000 },
  agency:  { monthly: 29700, annual: 23700, credits: 15000 },
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_")) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.");
  }
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { tier, billing } = body as { tier?: string; billing?: string };

    if (!tier || !billing || !["monthly", "annual"].includes(billing)) {
      return NextResponse.json({ error: "Missing or invalid tier / billing" }, { status: 422 });
    }
    if (!PLAN_PRICES_CENTS[tier]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 422 });
    }

  const plan = PLAN_PRICES_CENTS[tier];
  const priceKey = `${tier}_${billing}`;
  const priceEnvVar = PRICE_ENV[priceKey];
  const stripePriceId = priceEnvVar ? process.env[priceEnvVar] : undefined;

  // Get or create Stripe customer
  const service = createServiceClient();
  const profileRes = await service.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileRes.data as unknown as Profile;

  const stripe = getStripe();
  let customerId = (profile as unknown as { stripe_customer_id?: string })?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.display_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await service.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const isAnnual = billing === "annual";

  let session;

  if (stripePriceId) {
    // Use pre-configured Stripe Price ID → recurring subscription
    session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      subscription_data: {
        metadata: { tier, billing, user_id: user.id },
      },
      metadata: { tier, billing, user_id: user.id },
      success_url: `${origin}/dashboard?subscription=success&plan=${tier}`,
      cancel_url:  `${origin}/pricing`,
    });
  } else {
    // Fallback: one-time payment (until Stripe products are configured)
    const unitAmount = isAnnual
      ? plan.annual * 12
      : plan.monthly;

    session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: {
              name: `Genesis Node ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan (${billing})`,
              description: `${plan.credits.toLocaleString()} credits${isAnnual ? " × 12 months" : " for 1 month"}`,
            },
          },
        },
      ],
      metadata: {
        credits: String(isAnnual ? plan.credits * 12 : plan.credits),
        user_id: user.id,
        tier,
      },
      success_url: `${origin}/dashboard?subscription=success&plan=${tier}`,
      cancel_url:  `${origin}/pricing`,
    });
  }

  return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed. Please try again.";
    console.error("[POST /api/billing/subscribe]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

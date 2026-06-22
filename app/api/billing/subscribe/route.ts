import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe-helpers";

const PLANS: Record<string, Record<string, { priceId: string; credits: number }>> = {
  starter: {
    monthly: { priceId: "price_starter_monthly", credits: 2000  },
    annual:  { priceId: "price_starter_annual",  credits: 24000 },
  },
  pro: {
    monthly: { priceId: "price_pro_monthly", credits: 10000  },
    annual:  { priceId: "price_pro_annual",  credits: 120000 },
  },
  agency: {
    monthly: { priceId: "price_agency_monthly", credits: 50000  },
    annual:  { priceId: "price_agency_annual",  credits: 600000 },
  },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { tier, billing } = await req.json() as { tier: string; billing: string };

  const plan = PLANS[tier]?.[billing];
  if (!plan) {
    return NextResponse.json({ error: "Invalid tier or billing period" }, { status: 422 });
  }

  const customerId = await getOrCreateStripeCustomer(service, user.id, user.email, null);
  const stripe = getStripe();
  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  // Check if the priceId is a real Stripe Price. If not, fall back to one-time checkout.
  let priceIsReal = false;
  try {
    const p = await stripe.prices.retrieve(plan.priceId);
    priceIsReal = !!p?.id;
  } catch { /* not found */ }

  if (priceIsReal) {
    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      payment_method_types: ["card"],
      mode:                 "subscription",
      line_items:           [{ price: plan.priceId, quantity: 1 }],
      metadata:             { tier, billing, credits: String(plan.credits), user_id: user.id },
      subscription_data:    { metadata: { tier, type: "subscription" } },
      success_url:          `${origin}/dashboard?subscribe=success&tier=${tier}`,
      cancel_url:           `${origin}/dashboard?subscribe=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  }

  // Fallback: one-time payment to simulate a plan purchase
  const yearlyDiscount = billing === "annual" ? 0.8 : 1;
  const basePrices: Record<string, number> = { starter: 1900, pro: 4900, agency: 14900 };
  const basePrice = basePrices[tier] ?? 1900;
  const months = billing === "annual" ? 12 : 1;
  const unitAmount = Math.round(basePrice * yearlyDiscount * months);

  const session = await stripe.checkout.sessions.create({
    customer:             customerId,
    payment_method_types: ["card"],
    mode:                 "payment",
    line_items: [
      {
        quantity:   1,
        price_data: {
          currency:    "usd",
          unit_amount: unitAmount,
          product_data: {
            name:        `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan (${billing})`,
            description: `Includes ${plan.credits.toLocaleString()} credits`,
          },
        },
      },
    ],
    metadata:    { tier, billing, credits: String(plan.credits), user_id: user.id },
    success_url: `${origin}/dashboard?subscribe=success&tier=${tier}`,
    cancel_url:  `${origin}/dashboard?subscribe=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}

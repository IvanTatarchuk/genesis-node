import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe-helpers";
import { rateLimit, CHECKOUT_RATE_LIMIT, getClientIp } from "@/lib/rate-limit";

// Credit packs: credits -> price in cents (3x previous prices)
const CREDIT_PRICES: Record<number, number> = {
  500:  1500,   // $15.00
  2000: 6000,   // $60.00
  5000: 15000,  // $150.00
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  // Rate limit: 5 checkout sessions per user per minute
  const ip = getClientIp(req);
  const rl = rateLimit(`checkout:${user.id}:${ip}`, CHECKOUT_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many checkout attempts. Please wait a moment." }, { status: 429 });
  }

  const { credits } = await req.json() as { credits: number };
  const priceInCents = CREDIT_PRICES[credits];

  if (!priceInCents) {
    return NextResponse.json({ error: "Invalid credit pack" }, { status: 422 });
  }

  const customerId = await getOrCreateStripeCustomer(service, user.id, user.email, null);
  const stripe = getStripe();
  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer:             customerId,
    payment_method_types: ["card"],
    mode:                 "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency:     "usd",
          unit_amount:  priceInCents,
          product_data: {
            name:        `${credits.toLocaleString()} GENESIS NODE Credits`,
            description: `Top up your balance with ${credits.toLocaleString()} credits ($${(priceInCents / 100).toFixed(2)})`,
          },
        },
      },
    ],
    metadata: { credits: String(credits), user_id: user.id },
    success_url: `${origin}/dashboard?purchase=success&credits=${credits}`,
    cancel_url:  `${origin}/dashboard?purchase=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}

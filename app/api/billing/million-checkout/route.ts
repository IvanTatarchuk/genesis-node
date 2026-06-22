import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe-helpers";
import { rateLimit, CHECKOUT_RATE_LIMIT, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const ip = getClientIp(req);
  const rl = rateLimit(`million-checkout:${user.id}:${ip}`, CHECKOUT_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many checkout attempts." }, { status: 429 });
  }

  const customerId = await getOrCreateStripeCustomer(service, user.id, user.email, null);
  const stripe = getStripe();
  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 399900,
          product_data: {
            name: "1,000,000 GENESIS NODE Credits",
            description: "Mega credit pack — best value ($0.004/credit)",
          },
        },
      },
    ],
    metadata: { credits: "1000000", user_id: user.id },
    success_url: `${origin}/dashboard?purchase=success&credits=1000000`,
    cancel_url: `${origin}/dashboard?purchase=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}

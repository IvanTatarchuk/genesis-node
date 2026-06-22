import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe-helpers";

const VIEWER_PRICES: Record<string, { amount: number; months: number }> = {
  monthly: { amount: 990,   months: 1  },
  annual:  { amount: 9500,  months: 12 },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { billing = "monthly" } = await req.json() as { billing?: string };
  const plan = VIEWER_PRICES[billing];
  if (!plan) return NextResponse.json({ error: "Invalid billing period" }, { status: 422 });

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
          unit_amount: plan.amount,
          product_data: {
            name: `Trinity Viewer (${billing})`,
            description: "Full access to Trinity 3-D visualizations",
          },
        },
      },
    ],
    metadata: {
      type: "trinity_viewer",
      billing,
      months: String(plan.months),
      user_id: user.id,
    },
    success_url: `${origin}/trinity?purchase=success`,
    cancel_url: `${origin}/trinity?purchase=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}

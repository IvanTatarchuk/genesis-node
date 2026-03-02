import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/database.types";

// Credit packs: credits → price in cents
const CREDIT_PRICES: Record<number, number> = {
  500:  500,   // $5.00
  2000: 2000,  // $20.00
  5000: 5000,  // $50.00
};

function getStripe() {
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { credits } = await req.json() as { credits: number };
  const priceInCents = CREDIT_PRICES[credits];

  if (!priceInCents) {
    return NextResponse.json({ error: "Invalid credit pack" }, { status: 422 });
  }

  // Get or create Stripe customer
  const service = createServiceClient();
  const profileRes = await service.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileRes.data as unknown as Profile;

  const stripe = getStripe();
  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name:  profile?.display_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await service
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

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

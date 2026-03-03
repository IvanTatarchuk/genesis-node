import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

const TRINITY_PRICE_ID = process.env.STRIPE_PRICE_TRINITY_VIEWER ?? "price_1T6vGAQY10nFVngxsUwyqXBf";

function getStripe() {
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service.from("profiles").select("stripe_customer_id, display_name").eq("id", user.id).single();

  const stripe = getStripe();
  let customerId = (profile as any)?.stripe_customer_id as string | undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: (profile as any)?.display_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await service.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const origin = req.headers.get("origin") ?? "https://genesis-node.vercel.app";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: TRINITY_PRICE_ID, quantity: 1 }],
    subscription_data: {
      metadata: { type: "trinity_viewer", user_id: user.id },
    },
    metadata: { type: "trinity_viewer", user_id: user.id },
    success_url: `${origin}/trinity-watch?subscribed=1`,
    cancel_url: `${origin}/trinity-watch`,
  });

  return NextResponse.json({ url: session.url });
}

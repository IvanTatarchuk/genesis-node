import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/database.types";
import { rateLimit, CHECKOUT_RATE_LIMIT, getClientIp } from "@/lib/rate-limit";

const MILLION_PRODUCT_CENTS = Number(process.env.MILLION_PRODUCT_CENTS) || 2_500_000; // $25,000 default
const PRODUCT_NAME = process.env.MILLION_PRODUCT_NAME || "Path to $1M — Enterprise";
const PRODUCT_DESCRIPTION =
  process.env.MILLION_PRODUCT_DESCRIPTION ||
  "Strategy, playbook, and 1:1 advisory to get your company to $1M ARR. One-time purchase.";

function getStripe() {
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const rl = rateLimit(`million:${ip}`, CHECKOUT_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment." },
      { status: 429 }
    );
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_")) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { email: guestEmail } = body as { email?: string };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const stripe = getStripe();
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  let customerId: string | undefined;

  if (user) {
    const service = createServiceClient();
    const profileRes = await service.from("profiles").select("*").eq("id", user.id).single();
    const profile = profileRes.data as unknown as Profile;
    customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile?.display_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await service
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }
  }

  const session = await stripe.checkout.sessions.create({
    ...(customerId ? { customer: customerId } : { customer_email: guestEmail || undefined }),
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: MILLION_PRODUCT_CENTS,
          product_data: {
            name: PRODUCT_NAME,
            description: PRODUCT_DESCRIPTION,
            images: process.env.MILLION_PRODUCT_IMAGE ? [process.env.MILLION_PRODUCT_IMAGE] : undefined,
          },
        },
      },
    ],
    metadata: { product: "million", user_id: user?.id ?? "guest" },
    success_url: `${origin}/million?success=1`,
    cancel_url: `${origin}/million?cancelled=1`,
  });

  return NextResponse.json({ url: session.url });
}

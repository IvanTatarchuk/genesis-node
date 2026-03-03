import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase-server";

// ── Constants ─────────────────────────────────────────────────────────────────
// 1 USD = 100 credits (each credit = $0.01)
const USD_TO_CREDITS = 100;

// Lazy-initialise Stripe so the module can be imported during build
// without STRIPE_SECRET_KEY being present.
function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function topUpCredits(
  stripeCustomerId: string,
  usdAmountCents: number,  // Stripe amount is already in cents
  paymentIntentId: string
): Promise<void> {
  const supabase = createServiceClient();

  // Find the profile by Stripe customer ID
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, balance")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (error || !profile) {
    throw new Error(`Profile not found for customer ${stripeCustomerId}`);
  }

  // $1.00 (100 cents) → 100 credits
  const creditsToAdd = Math.floor((usdAmountCents / 100) * USD_TO_CREDITS);

  // Atomic balance update + transaction log
  const [updateRes, txnRes] = await Promise.all([
    supabase
      .from("profiles")
      .update({ balance: profile.balance + creditsToAdd })
      .eq("id", profile.id),
    supabase.from("credit_transactions").insert({
      profile_id:   profile.id,
      amount:       creditsToAdd,
      type:         "purchase",
      reference_id: paymentIntentId,
      description:  `Top-up: ${creditsToAdd} credits ($${(usdAmountCents / 100).toFixed(2)})`,
    }),
  ]);

  if (updateRes.error) throw updateRes.error;
  if (txnRes.error)    throw txnRes.error;
}

// ── Webhook handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {

      // ── One-time credit purchase (Checkout Session) ──────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status !== "paid") break;
        if (!session.customer || !session.amount_total) break;

        await topUpCredits(
          String(session.customer),
          session.amount_total,
          session.payment_intent as string
        );
        break;
      }

      // ── Subscription renewal (monthly credit pack) ────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.billing_reason !== "subscription_cycle") break;
        if (!invoice.customer || !invoice.amount_paid) break;

        await topUpCredits(
          String(invoice.customer),
          invoice.amount_paid,
          (invoice as Stripe.Invoice & { payment_intent?: string }).payment_intent ?? invoice.id
        );
        break;
      }

      // ── Subscription activated / updated ─────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const tier = (sub.metadata?.tier as string) ?? "starter";
        const supabase = createServiceClient();
        // current_period_end lives on the subscription items in newer Stripe versions
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
        await supabase
          .from("profiles")
          .update({
            subscription_tier: tier,
            subscription_id: sub.id,
            subscription_ends: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
          .eq("stripe_customer_id", String(sub.customer));
        break;
      }

      // ── Subscription cancelled ────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const supabase = createServiceClient();
        await supabase
          .from("profiles")
          .update({ subscription_tier: "free", subscription_id: null })
          .eq("stripe_customer_id", String(sub.customer));
        break;
      }

      default:
        // Unhandled event — return 200 so Stripe stops retrying
        break;
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe webhook] Handler error:", msg);
    // Return 500 so Stripe retries
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Disable body parsing — we need the raw body for signature verification
export const config = {
  api: { bodyParser: false },
};

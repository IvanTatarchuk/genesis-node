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
  usdAmountCents: number,
  referenceId: string,
  creditsOverride?: number
): Promise<void> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("reference_id", referenceId)
    .maybeSingle();

  if (existing) {
    console.log(`[Stripe webhook] Skipping duplicate payment: ${referenceId}`);
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, balance")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (error || !profile) {
    throw new Error(`Profile not found for customer ${stripeCustomerId}`);
  }

  const creditsToAdd = creditsOverride != null && creditsOverride > 0
    ? creditsOverride
    : Math.floor((usdAmountCents / 100) * USD_TO_CREDITS);

  const [updateRes, txnRes] = await Promise.all([
    supabase
      .from("profiles")
      .update({ balance: profile.balance + creditsToAdd })
      .eq("id", profile.id),
    supabase.from("credit_transactions").insert({
      profile_id:   profile.id,
      amount:       creditsToAdd,
      type:         "purchase",
      reference_id: referenceId,
      description:  `Top-up: ${creditsToAdd} credits ($${(usdAmountCents / 100).toFixed(2)})`,
    }),
  ]);

  if (updateRes.error) throw updateRes.error;
  if (txnRes.error)    throw txnRes.error;

  console.log(`[Stripe webhook] Credited ${creditsToAdd} to ${profile.id} (${referenceId})`);
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

      // ── One-time credit purchase or subscription fallback (Checkout Session) ──
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status !== "paid") break;
        if (!session.customer) break;

        const referenceId = (session.payment_intent as string) ?? session.id;
        const amountTotal = session.amount_total ?? 0;
        const metadataCredits = session.metadata?.credits ? parseInt(String(session.metadata.credits), 10) : undefined;

        await topUpCredits(
          String(session.customer),
          amountTotal,
          referenceId,
          metadataCredits
        );

        // Fallback subscription: update tier when no Stripe subscription (one-time plan purchase)
        const tier = session.metadata?.tier as string | undefined;
        if (tier && ["starter", "pro", "agency"].includes(tier)) {
          const billing = session.metadata?.billing as string | undefined;
          const months = billing === "annual" ? 12 : 1;
          const ends = new Date();
          ends.setMonth(ends.getMonth() + months);
          const supabase = createServiceClient();
          await supabase
            .from("profiles")
            .update({
              subscription_tier: tier,
              subscription_ends: ends.toISOString(),
            })
            .eq("stripe_customer_id", String(session.customer));
        }
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
        const subType = (sub.metadata?.type as string) ?? "";
        const tier = (sub.metadata?.tier as string) ?? "starter";
        const supabase = createServiceClient();
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
        const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

        if (subType === "trinity_viewer") {
          // Trinity Viewer subscription
          await supabase
            .from("profiles")
            .update({
              trinity_viewer_active: sub.status === "active",
              trinity_viewer_subscription_id: sub.id,
              trinity_viewer_ends: periodEndIso,
            })
            .eq("stripe_customer_id", String(sub.customer));
        } else {
          await supabase
            .from("profiles")
            .update({
              subscription_tier: tier,
              subscription_id: sub.id,
              subscription_ends: periodEndIso,
            })
            .eq("stripe_customer_id", String(sub.customer));
        }
        break;
      }

      // ── Subscription cancelled ────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const subType = (sub.metadata?.type as string) ?? "";
        const supabase = createServiceClient();

        if (subType === "trinity_viewer") {
          await supabase
            .from("profiles")
            .update({ trinity_viewer_active: false, trinity_viewer_subscription_id: null })
            .eq("stripe_customer_id", String(sub.customer));
        } else {
          await supabase
            .from("profiles")
            .update({ subscription_tier: "free", subscription_id: null })
            .eq("stripe_customer_id", String(sub.customer));
        }
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

// App Router: raw body is read via req.text() above; no config needed.

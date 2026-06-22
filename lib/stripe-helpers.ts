import { createServiceClient } from "@/lib/supabase-server";

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Lazily initialise a Stripe SDK instance.
 * Throws if STRIPE_SECRET_KEY is not configured.
 */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_")) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.");
  }
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

/**
 * Resolve or create a Stripe customer for the given user.
 * Persists the customer ID back to the profiles table.
 */
export async function getOrCreateStripeCustomer(
  service: ServiceClient,
  userId: string,
  email: string | undefined,
  displayName: string | null | undefined,
): Promise<string> {
  const { data: profile } = await service
    .from("profiles")
    .select("stripe_customer_id, display_name")
    .eq("id", userId)
    .single() as { data: { stripe_customer_id?: string | null; display_name?: string | null } | null };

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const stripe = getStripe();
  const name = displayName ?? profile?.display_name ?? undefined;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { supabase_user_id: userId },
  });

  await service
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  return customer.id as string;
}

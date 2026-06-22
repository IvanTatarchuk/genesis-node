import { createServiceClient } from "@/lib/supabase-server";

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Credit MATADORA to a user's wallet.
 * Ensures the wallet row exists, increments balance + total_earned,
 * and logs a transaction.
 */
export async function creditMatadoraWallet(
  service: ServiceClient,
  profileId: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string | null,
): Promise<void> {
  await service.from("matadora_wallets").upsert(
    { profile_id: profileId, balance: 0 },
    { onConflict: "profile_id", ignoreDuplicates: true },
  );

  const { data: wallet } = await service
    .from("matadora_wallets")
    .select("balance, total_earned")
    .eq("profile_id", profileId)
    .single() as { data: { balance: number; total_earned: number } | null };

  await service
    .from("matadora_wallets")
    .update({
      balance: (wallet?.balance ?? 0) + amount,
      total_earned: (wallet?.total_earned ?? 0) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId);

  await service.from("matadora_transactions").insert({
    profile_id: profileId,
    amount,
    type,
    description,
    reference_id: referenceId ?? null,
  });
}

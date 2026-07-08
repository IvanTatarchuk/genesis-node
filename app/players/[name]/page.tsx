import Link from "next/link";
import type { CSSProperties } from "react";

import { cosmetics } from "@/lib/cosmetics";
import { fetchOwnedCosmeticIds, fetchPlayer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface PlayerProfilePageProps {
  params: Promise<{ name: string }>;
}

/**
 * Public, read-only profile: a player's shard balance, equipped cosmetic, and
 * the cosmetics they own. Linked from the leaderboard so a name there goes
 * somewhere. Read-only on purpose — buying/equipping lives in `/shop`, which
 * requires the claim token this page never needs (nothing here is private:
 * shards and cosmetics are already shown on the leaderboard). Degrades the same
 * way the leaderboard does when Supabase isn't configured: shows the reason
 * instead of crashing.
 */
export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  let shards = 0;
  let activeCosmeticId: string | null = null;
  let ownedIds: string[] = [];
  let error: string | null = null;

  try {
    const [player, owned] = await Promise.all([fetchPlayer(name), fetchOwnedCosmeticIds(name)]);
    shards = player?.shards ?? 0;
    activeCosmeticId = player?.active_cosmetic_id ?? null;
    ownedIds = owned;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const badge = activeCosmeticId ? cosmetics[activeCosmeticId] : undefined;
  const owned = ownedIds.map((id) => cosmetics[id]).filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>
        {name}
        {badge && (
          <span style={{ marginLeft: "0.5rem", fontSize: "1.1rem" }} title={badge.name}>
            {badge.name}
          </span>
        )}
      </h1>
      <p>
        <Link href="/">Home</Link> · <Link href="/leaderboard">Leaderboard</Link> ·{" "}
        <Link href="/shop">Shop</Link>
      </p>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!error && (
        <>
          <p style={{ fontSize: "1.1rem" }}>
            <strong>{shards}</strong> shards
          </p>

          <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Cosmetics</h2>
          {owned.length === 0 ? (
            <p style={{ color: "#777" }}>
              No cosmetics yet — earn shards by passing challenges, then spend them in the{" "}
              <Link href="/shop">shop</Link>.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
              {owned.map((cosmetic) => {
                const equipped = cosmetic.id === activeCosmeticId;
                return (
                  <li key={cosmetic.id} style={{ ...cardStyle, borderColor: equipped ? "#3a3" : "#ddd" }}>
                    <span style={{ fontWeight: "bold" }}>{cosmetic.name}</span>
                    {equipped && <span style={{ marginLeft: "0.5rem", color: "#3a3" }}>equipped</span>}
                    <span style={{ display: "block", color: "#555" }}>{cosmetic.description}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

const cardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 4,
  padding: "0.5rem 0.75rem",
};

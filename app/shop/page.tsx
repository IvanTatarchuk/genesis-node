"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { getStoredClaimToken } from "@/lib/claimToken";
import { cosmeticsList } from "@/lib/cosmetics";

interface PlayerState {
  shards: number;
  activeCosmeticId: string | null;
  ownedCosmeticIds: string[];
}

/**
 * Shop/profile page: load a player by name, see their shard balance, buy
 * cosmetics with shards, and equip an owned one to show on the leaderboard.
 * No login system exists yet — player identity is just the name typed here,
 * same as the run submission form on the home page. Buying/equipping does
 * require proof of ownership though (see lib/claimToken.ts): this page reads
 * that name's claim token from localStorage, so it only works from a
 * browser that has actually played as this name before.
 */
export default function ShopPage() {
  const [playerName, setPlayerName] = useState("");
  const [loadedName, setLoadedName] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPlayer(name: string) {
    setError(null);
    const res = await fetch(`/api/players/${encodeURIComponent(name)}`);
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? `request failed (${res.status})`);
      return;
    }
    setPlayer({
      shards: body.player.shards,
      activeCosmeticId: body.player.active_cosmetic_id,
      ownedCosmeticIds: body.ownedCosmeticIds,
    });
    setLoadedName(name);
    setClaimToken(getStoredClaimToken(name));
  }

  async function handleLoad(event: FormEvent) {
    event.preventDefault();
    if (!playerName) return;
    await loadPlayer(playerName);
  }

  async function handleBuy(cosmeticId: string) {
    if (!loadedName || !claimToken) return;
    setBusyId(cosmeticId);
    setError(null);

    const res = await fetch("/api/cosmetics/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: loadedName, cosmeticId, claimToken }),
    });
    const body = await res.json();
    setBusyId(null);

    if (!res.ok) {
      setError(body.error ?? `request failed (${res.status})`);
      return;
    }
    await loadPlayer(loadedName);
  }

  async function handleEquip(cosmeticId: string) {
    if (!loadedName || !claimToken) return;
    setBusyId(cosmeticId);
    setError(null);

    const res = await fetch("/api/cosmetics/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: loadedName, cosmeticId, claimToken }),
    });
    const body = await res.json();
    setBusyId(null);

    if (!res.ok) {
      setError(body.error ?? `request failed (${res.status})`);
      return;
    }
    await loadPlayer(loadedName);
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Shop</h1>
      <p>
        <Link href="/">Back</Link>
      </p>

      <form onSubmit={handleLoad} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <input
          required
          placeholder="Player name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit">Load</button>
      </form>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {player && (
        <p>
          <strong>{loadedName}</strong> has <strong>{player.shards}</strong> shards.
        </p>
      )}

      {player && !claimToken && (
        <p style={{ color: "#a60" }}>
          This browser doesn&apos;t recognize &quot;{loadedName}&quot; as yours — play a challenge
          under this name here first before you can buy or equip anything.
        </p>
      )}

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {cosmeticsList.map((cosmetic) => {
          const owned = player?.ownedCosmeticIds.includes(cosmetic.id) ?? false;
          const equipped = player?.activeCosmeticId === cosmetic.id;
          const canAfford = (player?.shards ?? 0) >= cosmetic.cost;

          return (
            <div
              key={cosmetic.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 4,
                padding: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: "bold" }}>{cosmetic.name}</p>
                <p style={{ margin: "0.25rem 0", color: "#555" }}>{cosmetic.description}</p>
                <p style={{ margin: 0, color: "#888" }}>{cosmetic.cost} shards</p>
              </div>

              {!player ? null : owned ? (
                <button
                  disabled={equipped || !claimToken || busyId === cosmetic.id}
                  onClick={() => handleEquip(cosmetic.id)}
                >
                  {equipped ? "Equipped" : busyId === cosmetic.id ? "Equipping..." : "Equip"}
                </button>
              ) : (
                <button
                  disabled={!canAfford || !claimToken || busyId === cosmetic.id}
                  onClick={() => handleBuy(cosmetic.id)}
                >
                  {busyId === cosmetic.id ? "Buying..." : "Buy"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

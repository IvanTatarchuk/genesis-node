/**
 * Client-side storage for a player's claim token (see supabase/schema.sql's
 * `claim_token` column) — proof of ownership of a player_name, needed for
 * purchaseCosmetic/equipCosmetic. Handed back by the server exactly once, at
 * player-creation time; stored here so the player doesn't have to paste it
 * back in on every visit. Losing it (different device/browser, cleared
 * storage) means losing the ability to spend that name's shards — there is
 * no recovery flow yet, matching the project's "no accounts" scope so far.
 */

function storageKey(playerName: string): string {
  return `agent-arena:claim-token:${playerName}`;
}

export function getStoredClaimToken(playerName: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(storageKey(playerName));
}

export function storeClaimToken(playerName: string, claimToken: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(playerName), claimToken);
}

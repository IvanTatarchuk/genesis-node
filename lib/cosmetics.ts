export interface Cosmetic {
  id: string;
  name: string;
  description: string;
  cost: number;
}

/**
 * Purely cosmetic titles/badges, bought with shards earned by passing
 * challenges (see lib/economy.ts). No effect on gameplay, no cashout path —
 * this is the "collect and show off" layer, not a wagering one.
 */
export const cosmeticsList: Cosmetic[] = [
  {
    id: "iron-will",
    name: "🛡️ Iron Will",
    description: "You don't give up, even after attempt five.",
    cost: 100,
  },
  {
    id: "one-shot-wonder",
    name: "⚡ One-Shot Wonder",
    description: "For those who nail it on the first try.",
    cost: 150,
  },
  {
    id: "og",
    name: "🌟 OG",
    description: "One of the first players in the arena.",
    cost: 500,
  },
];

export const cosmetics: Record<string, Cosmetic> = Object.fromEntries(
  cosmeticsList.map((cosmetic) => [cosmetic.id, cosmetic])
);

export function getCosmetic(id: string): Cosmetic {
  const cosmetic = cosmetics[id];
  if (!cosmetic) {
    throw new Error(`unknown cosmetic id: ${id}`);
  }
  return cosmetic;
}

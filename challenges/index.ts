import type { Challenge } from "../lib/challenge";
import { sumRangeChallenge } from "./sum-range";

export const challenges: Record<string, Challenge> = {
  [sumRangeChallenge.id]: sumRangeChallenge,
};

export function getChallenge(id: string): Challenge {
  const challenge = challenges[id];
  if (!challenge) {
    throw new Error(`unknown challenge id: ${id}`);
  }
  return challenge;
}

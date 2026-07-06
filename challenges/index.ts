import type { Challenge } from "../lib/challenge";
import { binarySearchChallenge } from "./binary-search";
import { isPalindromeChallenge } from "./is-palindrome";
import { mergeIntervalsChallenge } from "./merge-intervals";
import { reverseWordsChallenge } from "./reverse-words";
import { sumRangeChallenge } from "./sum-range";

export const challengeList: Challenge[] = [
  sumRangeChallenge,
  reverseWordsChallenge,
  isPalindromeChallenge,
  binarySearchChallenge,
  mergeIntervalsChallenge,
];

export const challenges: Record<string, Challenge> = Object.fromEntries(
  challengeList.map((challenge) => [challenge.id, challenge])
);

export function getChallenge(id: string): Challenge {
  const challenge = challenges[id];
  if (!challenge) {
    throw new Error(`unknown challenge id: ${id}`);
  }
  return challenge;
}

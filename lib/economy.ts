/**
 * Virtual currency only: no real money, no cashout, no wagering — see
 * docs/IDEAS_BACKLOG.md (mcp-guard repo) for why this line matters. Shards
 * are earned by passing challenges and spent on cosmetics; there is no path
 * from shards back to real money in either direction.
 */

const BASE_REWARD = 100;
const PENALTY_PER_EXTRA_ITERATION = 15;
const MINIMUM_REWARD = 25;
const AUTHOR_REWARD = 20;

/**
 * A one-shot pass earns the full base reward; each additional attempt beyond
 * the first chips away at it (rewards efficiency, not just eventually
 * succeeding), floored so a hard-won pass is never worth nothing.
 *
 * `modelMultiplier` scales the whole thing by the loadout's model (see
 * lib/loadouts.ts): a weaker/cheaper model pays more because clearing the same
 * challenge with it is the harder play. The floor and multiplier compose so
 * that the minimum is scaled too — a hard-won pass on a weak model is still
 * worth more than a hard-won pass on the strongest one. The multiplier is
 * applied last and rounded, so rewards stay whole numbers.
 */
export function calculateReward(
  passed: boolean,
  iterations: number,
  modelMultiplier = 1
): number {
  if (!passed) return 0;

  const extraIterations = Math.max(0, iterations - 1);
  const tapered = BASE_REWARD - PENALTY_PER_EXTRA_ITERATION * extraIterations;
  const reward = Math.max(MINIMUM_REWARD, tapered);
  return Math.round(reward * modelMultiplier);
}

/**
 * The "revenue share" for a player-authored challenge: a flat reward to the
 * author every time someone else's run against their challenge passes,
 * regardless of how many iterations it took them. Flat (not tapered like
 * calculateReward) because the author didn't do the work this run — the cost
 * is in making a challenge worth playing at all, not in how efficiently this
 * particular attempt succeeded.
 */
export function calculateAuthorReward(passed: boolean): number {
  return passed ? AUTHOR_REWARD : 0;
}

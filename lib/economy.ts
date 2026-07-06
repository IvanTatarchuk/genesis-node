/**
 * Virtual currency only: no real money, no cashout, no wagering — see
 * docs/IDEAS_BACKLOG.md (mcp-guard repo) for why this line matters. Shards
 * are earned by passing challenges and spent on cosmetics; there is no path
 * from shards back to real money in either direction.
 */

const BASE_REWARD = 100;
const PENALTY_PER_EXTRA_ITERATION = 15;
const MINIMUM_REWARD = 25;

/**
 * A one-shot pass earns the full base reward; each additional attempt beyond
 * the first chips away at it (rewards efficiency, not just eventually
 * succeeding), floored so a hard-won pass is never worth nothing.
 */
export function calculateReward(passed: boolean, iterations: number): number {
  if (!passed) return 0;

  const extraIterations = Math.max(0, iterations - 1);
  const reward = BASE_REWARD - PENALTY_PER_EXTRA_ITERATION * extraIterations;
  return Math.max(MINIMUM_REWARD, reward);
}

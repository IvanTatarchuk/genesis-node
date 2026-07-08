/**
 * Elo ratings for the arena — the citable abstraction on top of the results
 * ledger, and the "rules, not rulers" piece of making the benchmark durable.
 *
 * The trick: treat every graded run as a game between two players — the *model*
 * (or loadout) and the *challenge*. If the run passes, the model "won" and the
 * challenge "lost"; if it fails, the reverse. Feed a whole history of runs
 * through standard Elo and two useful things fall out at once, with no human
 * labeling and no authority to trust:
 *
 *   - a rating per model — which model is actually best at debugging, measured
 *     against how hard the challenges it faced turned out to be;
 *   - a difficulty rating per challenge — self-calibrating from real outcomes,
 *     so a challenge everyone's agent one-shots sinks and a genuinely hard one
 *     rises, without anyone hand-labeling difficulty.
 *
 * Because a coding result is reproducible (see lib/ledger.ts), the input is
 * objective and the whole computation is deterministic given the ordered
 * results — anyone can recompute the exact same ratings from the published
 * ledger and check them. That's what makes a rating worth citing.
 *
 * Pure and dependency-free, so it's fully unit-testable without a database.
 */

/** Every competitor starts here (a conventional Elo seed). */
export const INITIAL_RATING = 1000;

/** How much a single result can move a rating. Higher = more reactive/noisier. */
export const DEFAULT_K = 32;

/** One graded run, reduced to what the rating cares about. */
export interface RatingResult {
  model: string;
  challengeId: string;
  passed: boolean;
}

export interface Ratings {
  /** model id -> Elo rating. */
  models: Record<string, number>;
  /** challenge id -> Elo difficulty rating (higher = harder). */
  challenges: Record<string, number>;
}

/**
 * Probability the higher-rated side "wins" — the standard Elo logistic. A
 * 400-point gap is ~10:1 odds.
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/**
 * Fold a chronological list of results into model and challenge ratings. Order
 * matters (as in all Elo) — the same runs in the same order always produce the
 * same ratings, so the result is reproducible from the ledger. Unknown ids are
 * seeded at INITIAL_RATING the first time they appear.
 */
export function computeRatings(results: RatingResult[], k: number = DEFAULT_K): Ratings {
  const models: Record<string, number> = {};
  const challenges: Record<string, number> = {};

  for (const { model, challengeId, passed } of results) {
    const modelRating = models[model] ?? INITIAL_RATING;
    const challengeRating = challenges[challengeId] ?? INITIAL_RATING;

    // The model scores 1 for a pass, 0 for a fail; the challenge scores the
    // complement. Beating a high-rated (hard) challenge moves the model more
    // than beating an easy one, because the expected score was lower.
    const modelScore = passed ? 1 : 0;
    const expectedModel = expectedScore(modelRating, challengeRating);

    models[model] = modelRating + k * (modelScore - expectedModel);
    challenges[challengeId] = challengeRating + k * (1 - modelScore - (1 - expectedModel));
  }

  return { models, challenges };
}

/** Sort a rating map into a descending leaderboard of `[id, rating]` pairs. */
export function rank(ratings: Record<string, number>): Array<[string, number]> {
  return Object.entries(ratings).sort((a, b) => b[1] - a[1]);
}

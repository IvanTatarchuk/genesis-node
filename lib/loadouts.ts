/**
 * A "loadout" is what the pitch promises: a model + a turn budget the player
 * chooses before running. This module is the single source of truth for both
 * halves — which models are offerable and how many attempts are allowed — so
 * the UI picker and the server-side validation can never drift apart.
 *
 * The model catalog is deliberately curated rather than free-form: `model` is
 * fed straight into the player's own Anthropic call *and* recorded verbatim on
 * the public leaderboard, so a typo'd or bogus id would either 404 the run or
 * pollute the board. Restricting to a known set turns "unknown model" into a
 * clean 400 up front instead of a confusing downstream failure.
 *
 * The agent loop sends only `model` / `max_tokens` / `tools` / `messages` — no
 * `thinking` or sampling params — so every model here is call-compatible without
 * per-model request tweaks (the newer models reject sampling params, but we
 * never send any).
 */

export interface ModelOption {
  id: string;
  /** Short human name shown in the picker and on the leaderboard. */
  label: string;
  /** One-line tradeoff so a player can reason about their loadout choice. */
  blurb: string;
  /**
   * Shard-reward multiplier for passing on this model. Weaker/cheaper models
   * pay *more* because clearing the same challenge with less firepower is the
   * harder, riskier play — this is what gives the model choice a real cost
   * instead of "always pick the strongest". The strongest model is the 1.0
   * baseline; see lib/economy.ts for how it folds into the taper.
   */
  rewardMultiplier: number;
}

/**
 * The offerable models, strongest first. These are current Anthropic model ids
 * a player's own key can call; the three tiers are the natural loadout choice —
 * spend more capability on a hard challenge, or take a cheaper/faster model for
 * the easy bugs and keep your one-shot bonus.
 */
export const MODELS: ModelOption[] = [
  {
    id: "claude-opus-4-8",
    label: "Opus 4.8",
    blurb: "Most capable — best shot at the hardest challenges.",
    rewardMultiplier: 1,
  },
  {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    blurb: "Balanced capability and speed — a solid default.",
    rewardMultiplier: 1.25,
  },
  {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    blurb: "Fastest and cheapest — plenty for the simpler bugs.",
    rewardMultiplier: 1.5,
  },
];

export const DEFAULT_MODEL = "claude-sonnet-5";

/**
 * Turn-budget bounds. The floor is 1 (a single one-shot attempt is a valid,
 * fully-rewarded loadout). The ceiling caps server work: each attempt is a real
 * sandboxed grading run plus a real model call, so an unbounded `maxIterations`
 * from a direct caller could tie up the request for the whole `maxDuration`.
 */
export const MIN_ITERATIONS = 1;
export const MAX_ITERATIONS = 8;
export const DEFAULT_ITERATIONS = 5;

/**
 * The reward multiplier at the tightest possible budget (MIN_ITERATIONS). The
 * widest budget (MAX_ITERATIONS) is the 1.0 baseline, and everything in between
 * interpolates linearly. Reserving fewer attempts is the bolder loadout — a
 * miss means no retries and zero reward — so committing to a tight budget is
 * worth more, the same risk/reward logic as the model multiplier. This is the
 * *declared* budget, independent of the per-iteration taper on attempts
 * actually used (lib/economy.ts): the taper rewards efficient execution, this
 * rewards a confident loadout.
 */
export const TIGHT_BUDGET_BONUS = 1.3;

export interface ValidatedLoadout {
  model: string;
  maxIterations: number;
}

export type LoadoutValidation =
  | { ok: true; loadout: ValidatedLoadout }
  | { ok: false; error: string };

/**
 * Resolve and validate a caller-supplied loadout. Missing fields fall back to
 * the defaults; an unknown model or an out-of-range attempt budget is rejected
 * (so the route can return a 400) rather than silently coerced — a bogus model
 * would fail confusingly deep in the agent call, and a silently-clamped budget
 * would mislead the caller about what actually ran.
 */
export function validateLoadout(input: {
  model?: string;
  maxIterations?: number;
}): LoadoutValidation {
  const model = input.model ?? DEFAULT_MODEL;
  if (!MODELS.some((m) => m.id === model)) {
    return {
      ok: false,
      error: `unsupported model: ${model} (allowed: ${MODELS.map((m) => m.id).join(", ")})`,
    };
  }

  const maxIterations = input.maxIterations ?? DEFAULT_ITERATIONS;
  if (typeof maxIterations !== "number" || !Number.isInteger(maxIterations)) {
    return { ok: false, error: "maxIterations must be an integer" };
  }
  if (maxIterations < MIN_ITERATIONS || maxIterations > MAX_ITERATIONS) {
    return {
      ok: false,
      error: `maxIterations must be between ${MIN_ITERATIONS} and ${MAX_ITERATIONS}`,
    };
  }

  return { ok: true, loadout: { model, maxIterations } };
}

/** Leaderboard/UI display: the friendly label for a recorded model id, or the
 * raw id if it isn't (or is no longer) in the catalog — e.g. an older run
 * recorded before this model set existed. */
export function modelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}

/** The shard-reward multiplier for a model id. Falls back to 1.0 (no bonus)
 * for an unknown/legacy id so an old model string can never inflate a reward. */
export function rewardMultiplier(id: string): number {
  return MODELS.find((m) => m.id === id)?.rewardMultiplier ?? 1;
}

/**
 * The reward multiplier for a declared attempt budget: TIGHT_BUDGET_BONUS at
 * MIN_ITERATIONS, tapering linearly to 1.0 at MAX_ITERATIONS. Clamped so a
 * budget outside the bounds can't push the multiplier past either end (the
 * routes validate the budget first, but this stays honest if called directly).
 */
export function budgetMultiplier(maxIterations: number): number {
  const clamped = Math.min(MAX_ITERATIONS, Math.max(MIN_ITERATIONS, maxIterations));
  const span = MAX_ITERATIONS - MIN_ITERATIONS;
  if (span === 0) return 1;
  const t = (clamped - MIN_ITERATIONS) / span; // 0 at tightest, 1 at widest
  return TIGHT_BUDGET_BONUS + t * (1 - TIGHT_BUDGET_BONUS);
}

/** The combined shard multiplier for a full loadout — model choice × attempt
 * budget. This is the single number the economy applies to a passing run. */
export function loadoutMultiplier(loadout: ValidatedLoadout): number {
  return rewardMultiplier(loadout.model) * budgetMultiplier(loadout.maxIterations);
}

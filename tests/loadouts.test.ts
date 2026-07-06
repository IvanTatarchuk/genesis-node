import { describe, expect, it } from "vitest";

import {
  budgetMultiplier,
  DEFAULT_ITERATIONS,
  DEFAULT_MODEL,
  loadoutMultiplier,
  MAX_ITERATIONS,
  MAX_STRATEGY_LENGTH,
  MIN_ITERATIONS,
  MODELS,
  modelLabel,
  rewardMultiplier,
  TIGHT_BUDGET_BONUS,
  validateLoadout,
} from "../lib/loadouts";

describe("catalog invariants", () => {
  it("offers at least one model, each with a unique id", () => {
    expect(MODELS.length).toBeGreaterThan(0);
    const ids = MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a default model that is actually in the catalog", () => {
    expect(MODELS.some((m) => m.id === DEFAULT_MODEL)).toBe(true);
  });

  it("has a default iteration budget within the allowed bounds", () => {
    expect(DEFAULT_ITERATIONS).toBeGreaterThanOrEqual(MIN_ITERATIONS);
    expect(DEFAULT_ITERATIONS).toBeLessThanOrEqual(MAX_ITERATIONS);
  });

  it("gives every model a reward multiplier of at least 1", () => {
    for (const m of MODELS) {
      expect(m.rewardMultiplier).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("validateLoadout", () => {
  it("fills in both defaults when nothing is supplied", () => {
    const result = validateLoadout({});
    expect(result).toEqual({
      ok: true,
      loadout: { model: DEFAULT_MODEL, maxIterations: DEFAULT_ITERATIONS },
    });
  });

  it("accepts every model the catalog offers", () => {
    for (const m of MODELS) {
      const result = validateLoadout({ model: m.id });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.loadout.model).toBe(m.id);
    }
  });

  it("rejects a model that isn't in the catalog", () => {
    const result = validateLoadout({ model: "gpt-4" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("unsupported model");
  });

  it("accepts the iteration bounds themselves", () => {
    expect(validateLoadout({ maxIterations: MIN_ITERATIONS }).ok).toBe(true);
    expect(validateLoadout({ maxIterations: MAX_ITERATIONS }).ok).toBe(true);
  });

  it("rejects an attempt budget outside the bounds", () => {
    expect(validateLoadout({ maxIterations: MIN_ITERATIONS - 1 }).ok).toBe(false);
    expect(validateLoadout({ maxIterations: MAX_ITERATIONS + 1 }).ok).toBe(false);
    expect(validateLoadout({ maxIterations: -3 }).ok).toBe(false);
  });

  it("rejects a non-integer attempt budget rather than silently flooring it", () => {
    expect(validateLoadout({ maxIterations: 2.5 }).ok).toBe(false);
    expect(validateLoadout({ maxIterations: Number.NaN }).ok).toBe(false);
  });

  it("has no strategy by default", () => {
    const result = validateLoadout({});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.loadout.strategy).toBeUndefined();
  });

  it("keeps a within-bounds strategy, trimmed", () => {
    const result = validateLoadout({ strategy: "  read the failing test first  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.loadout.strategy).toBe("read the failing test first");
  });

  it("treats a blank/whitespace strategy as none", () => {
    const result = validateLoadout({ strategy: "   \n  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.loadout.strategy).toBeUndefined();
  });

  it("rejects a strategy longer than the cap", () => {
    const result = validateLoadout({ strategy: "x".repeat(MAX_STRATEGY_LENGTH + 1) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/strategy/);
  });

  it("accepts a strategy exactly at the cap", () => {
    expect(validateLoadout({ strategy: "x".repeat(MAX_STRATEGY_LENGTH) }).ok).toBe(true);
  });
});

describe("modelLabel", () => {
  it("returns the friendly label for a known model id", () => {
    expect(modelLabel(DEFAULT_MODEL)).toBe(MODELS.find((m) => m.id === DEFAULT_MODEL)!.label);
  });

  it("falls back to the raw id for an unknown/legacy model", () => {
    expect(modelLabel("claude-sonnet-4-5")).toBe("claude-sonnet-4-5");
  });
});

describe("rewardMultiplier", () => {
  it("returns the catalog multiplier for a known model", () => {
    for (const m of MODELS) {
      expect(rewardMultiplier(m.id)).toBe(m.rewardMultiplier);
    }
  });

  it("falls back to 1.0 for an unknown/legacy model so it can't inflate a reward", () => {
    expect(rewardMultiplier("claude-sonnet-4-5")).toBe(1);
  });
});

describe("budgetMultiplier", () => {
  it("pays the tight-budget bonus at the minimum budget", () => {
    expect(budgetMultiplier(MIN_ITERATIONS)).toBeCloseTo(TIGHT_BUDGET_BONUS);
  });

  it("is the 1.0 baseline at the maximum budget", () => {
    expect(budgetMultiplier(MAX_ITERATIONS)).toBeCloseTo(1);
  });

  it("decreases monotonically as the budget widens", () => {
    for (let b = MIN_ITERATIONS; b < MAX_ITERATIONS; b++) {
      expect(budgetMultiplier(b)).toBeGreaterThan(budgetMultiplier(b + 1));
    }
  });

  it("clamps a budget outside the bounds instead of overshooting", () => {
    expect(budgetMultiplier(MIN_ITERATIONS - 5)).toBeCloseTo(TIGHT_BUDGET_BONUS);
    expect(budgetMultiplier(MAX_ITERATIONS + 5)).toBeCloseTo(1);
  });
});

describe("loadoutMultiplier", () => {
  it("is the product of the model and budget multipliers", () => {
    const model = "claude-haiku-4-5";
    const maxIterations = MIN_ITERATIONS;
    expect(loadoutMultiplier({ model, maxIterations })).toBeCloseTo(
      rewardMultiplier(model) * budgetMultiplier(maxIterations)
    );
  });

  it("is 1.0 for the strongest model at the widest budget", () => {
    expect(loadoutMultiplier({ model: "claude-opus-4-8", maxIterations: MAX_ITERATIONS })).toBeCloseTo(1);
  });
});

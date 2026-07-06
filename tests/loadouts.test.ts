import { describe, expect, it } from "vitest";

import {
  DEFAULT_ITERATIONS,
  DEFAULT_MODEL,
  MAX_ITERATIONS,
  MIN_ITERATIONS,
  MODELS,
  modelLabel,
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
});

describe("modelLabel", () => {
  it("returns the friendly label for a known model id", () => {
    expect(modelLabel(DEFAULT_MODEL)).toBe(MODELS.find((m) => m.id === DEFAULT_MODEL)!.label);
  });

  it("falls back to the raw id for an unknown/legacy model", () => {
    expect(modelLabel("claude-sonnet-4-5")).toBe("claude-sonnet-4-5");
  });
});

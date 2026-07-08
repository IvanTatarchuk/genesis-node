import { describe, expect, it } from "vitest";

import {
  computeRatings,
  DEFAULT_K,
  expectedScore,
  INITIAL_RATING,
  rank,
  type RatingResult,
} from "../lib/rating";

describe("expectedScore", () => {
  it("is 0.5 between equal ratings", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
  });

  it("favours the higher-rated side, and the two sides sum to 1", () => {
    expect(expectedScore(1400, 1000)).toBeGreaterThan(0.5);
    expect(expectedScore(1400, 1000) + expectedScore(1000, 1400)).toBeCloseTo(1);
  });

  it("gives ~10:1 odds at a 400-point gap", () => {
    expect(expectedScore(1400, 1000)).toBeCloseTo(10 / 11, 2);
  });
});

describe("computeRatings", () => {
  it("seeds unknown ids at the initial rating and returns empty maps for no results", () => {
    const ratings = computeRatings([]);
    expect(ratings).toEqual({ models: {}, challenges: {} });
  });

  it("raises a model that passes and lowers the challenge it beat", () => {
    const ratings = computeRatings([{ model: "m", challengeId: "c", passed: true }]);
    expect(ratings.models["m"]).toBeGreaterThan(INITIAL_RATING);
    expect(ratings.challenges["c"]).toBeLessThan(INITIAL_RATING);
  });

  it("lowers a model that fails and raises the challenge that beat it", () => {
    const ratings = computeRatings([{ model: "m", challengeId: "c", passed: false }]);
    expect(ratings.models["m"]).toBeLessThan(INITIAL_RATING);
    expect(ratings.challenges["c"]).toBeGreaterThan(INITIAL_RATING);
  });

  it("conserves points between the two sides of a game (zero-sum update)", () => {
    const ratings = computeRatings([{ model: "m", challengeId: "c", passed: true }]);
    const moved = ratings.models["m"]! - INITIAL_RATING;
    const lost = INITIAL_RATING - ratings.challenges["c"]!;
    expect(moved).toBeCloseTo(lost);
  });

  it("rewards beating a hard challenge more than an easy one", () => {
    // Make challenge H hard (it beats a model repeatedly) and E easy (it loses).
    const setup: RatingResult[] = [];
    for (let i = 0; i < 20; i++) {
      setup.push({ model: "grinder", challengeId: "H", passed: false });
      setup.push({ model: "grinder", challengeId: "E", passed: true });
    }
    const base = computeRatings(setup);
    expect(base.challenges["H"]!).toBeGreaterThan(base.challenges["E"]!);

    // A fresh model beats each once — the gain vs H should exceed the gain vs E.
    const afterH = computeRatings([...setup, { model: "fresh", challengeId: "H", passed: true }]);
    const afterE = computeRatings([...setup, { model: "fresh", challengeId: "E", passed: true }]);
    expect(afterH.models["fresh"]!).toBeGreaterThan(afterE.models["fresh"]!);
  });

  it("is deterministic for the same ordered input", () => {
    const results: RatingResult[] = [
      { model: "a", challengeId: "x", passed: true },
      { model: "b", challengeId: "x", passed: false },
    ];
    expect(computeRatings(results)).toEqual(computeRatings(results));
  });

  it("respects a custom K factor (bigger K moves ratings more)", () => {
    const one = [{ model: "m", challengeId: "c", passed: true }];
    const small = computeRatings(one, 16).models["m"]!;
    const big = computeRatings(one, 64).models["m"]!;
    expect(big - INITIAL_RATING).toBeGreaterThan(small - INITIAL_RATING);
    expect(DEFAULT_K).toBe(32);
  });
});

describe("rank", () => {
  it("orders a rating map from highest to lowest", () => {
    expect(rank({ a: 1200, b: 900, c: 1050 })).toEqual([
      ["a", 1200],
      ["c", 1050],
      ["b", 900],
    ]);
  });
});

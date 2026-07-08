import { describe, expect, it } from "vitest";

import { calculateAuthorReward, calculateReward } from "../lib/economy";

describe("calculateReward", () => {
  it("pays nothing for a failed run, regardless of iteration count", () => {
    expect(calculateReward(false, 1)).toBe(0);
    expect(calculateReward(false, 5)).toBe(0);
  });

  it("pays the full base reward for a one-shot pass", () => {
    expect(calculateReward(true, 1)).toBe(100);
  });

  it("chips away at the reward for each extra attempt", () => {
    expect(calculateReward(true, 2)).toBe(85);
    expect(calculateReward(true, 3)).toBe(70);
  });

  it("never pays less than the minimum, however many attempts it took", () => {
    expect(calculateReward(true, 10)).toBe(25);
    expect(calculateReward(true, 1000)).toBe(25);
  });

  it("defaults to a 1.0 model multiplier (unchanged reward)", () => {
    expect(calculateReward(true, 1)).toBe(100);
    expect(calculateReward(true, 2)).toBe(85);
  });

  it("scales the reward by the model multiplier, rounded to a whole number", () => {
    // one-shot: 100 * 1.5 = 150
    expect(calculateReward(true, 1, 1.5)).toBe(150);
    // tapered: (100 - 15) * 1.25 = 106.25 -> 106
    expect(calculateReward(true, 2, 1.25)).toBe(106);
  });

  it("scales the floor too, so a weak-model pass still beats a strong-model one", () => {
    // floor 25 * 1.5 = 37.5 -> 38, vs 25 at the 1.0 baseline
    expect(calculateReward(true, 1000, 1.5)).toBe(38);
    expect(calculateReward(true, 1000, 1)).toBe(25);
  });

  it("still pays nothing for a failed run, whatever the multiplier", () => {
    expect(calculateReward(false, 1, 1.5)).toBe(0);
  });
});

describe("calculateAuthorReward", () => {
  it("pays nothing when the run didn't pass", () => {
    expect(calculateAuthorReward(false)).toBe(0);
  });

  it("pays a flat reward when the run passed, regardless of iterations", () => {
    expect(calculateAuthorReward(true)).toBe(20);
  });
});

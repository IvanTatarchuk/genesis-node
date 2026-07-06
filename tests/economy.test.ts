import { describe, expect, it } from "vitest";

import { calculateReward } from "../lib/economy";

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
});

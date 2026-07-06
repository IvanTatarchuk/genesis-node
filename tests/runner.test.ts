import { describe, expect, it } from "vitest";

import { sumRangeChallenge } from "../challenges/sum-range";
import { runChallenge } from "../lib/runner";

describe("runChallenge", () => {
  it("fails the unmodified, buggy starter code", async () => {
    const result = await runChallenge(sumRangeChallenge, sumRangeChallenge.files["sum.js"]!);

    expect(result.passed).toBe(false);
  }, 15_000);

  it("passes a correct solution", async () => {
    const fixed = [
      "function sumRange(n) {",
      "  let total = 0;",
      "  for (let i = 1; i <= n; i++) {",
      "    total += i;",
      "  }",
      "  return total;",
      "}",
      "",
      "module.exports = { sumRange };",
      "",
    ].join("\n");

    const result = await runChallenge(sumRangeChallenge, fixed);

    expect(result.passed).toBe(true);
    expect(result.durationMs).toBeGreaterThan(0);
  }, 15_000);

  it("fails a syntactically broken solution without throwing", async () => {
    const result = await runChallenge(sumRangeChallenge, "this is not valid javascript {{{");

    expect(result.passed).toBe(false);
    // Node's test runner reports failures (including syntax errors) via its TAP
    // output on stdout, not stderr.
    expect(result.stdout).toContain("SyntaxError");
  }, 15_000);
});

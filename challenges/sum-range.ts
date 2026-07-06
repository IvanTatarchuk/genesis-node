import type { Challenge } from "../lib/challenge";

/**
 * Deliberately trivial first challenge: a one-line off-by-one bug, graded by
 * Node's built-in test runner (`node --test`) so grading needs zero
 * dependencies — the sandbox blocks network access, so `npm install` at
 * grading time isn't an option.
 */
export const sumRangeChallenge: Challenge = {
  id: "sum-range",
  title: "Fix sumRange off-by-one",
  prompt:
    "The function `sumRange(n)` in `sum.js` is supposed to return the sum of all " +
    "integers from 1 to n (inclusive). It has an off-by-one bug. Fix `sum.js` so every " +
    "test in `sum.test.js` passes. Respond with ONLY the corrected, complete content of " +
    "sum.js — no explanation, no markdown code fences.",
  files: {
    "sum.js": [
      "function sumRange(n) {",
      "  let total = 0;",
      "  for (let i = 0; i < n; i++) {",
      "    total += i;",
      "  }",
      "  return total;",
      "}",
      "",
      "module.exports = { sumRange };",
      "",
    ].join("\n"),
    "sum.test.js": [
      "const { test } = require('node:test');",
      "const assert = require('node:assert');",
      "const { sumRange } = require('./sum.js');",
      "",
      "test('sumRange(5) === 15', () => {",
      "  assert.strictEqual(sumRange(5), 15);",
      "});",
      "",
      "test('sumRange(1) === 1', () => {",
      "  assert.strictEqual(sumRange(1), 1);",
      "});",
      "",
      "test('sumRange(0) === 0', () => {",
      "  assert.strictEqual(sumRange(0), 0);",
      "});",
      "",
    ].join("\n"),
  },
  solutionFile: "sum.js",
  testCommand: ["node", "--test", "sum.test.js"],
};

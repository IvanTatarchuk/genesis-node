import type { Challenge } from "../lib/challenge";

/**
 * Deliberately harder than the one-line-bug challenges: the starter has *two*
 * independent defects, and the test suite is built so that fixing only one
 * still fails. It (a) assumes the input is already sorted by start, and (b)
 * uses a strict `<` overlap check that misses intervals which merely touch at
 * an endpoint. An agent has to diagnose both from the failing cases, not just
 * patch the first thing it spots — which is the point: it exercises the
 * iterate-on-real-test-output loop rather than a single lucky guess.
 */
export const mergeIntervalsChallenge: Challenge = {
  id: "merge-intervals",
  title: "Fix mergeIntervals",
  prompt:
    "The function `mergeIntervals(intervals)` in `merge-intervals.js` takes an array of `[start, end]` " +
    "pairs and should return the non-overlapping intervals that cover the same points, sorted by start. " +
    "Two intervals must be merged when they overlap OR when they only touch at an endpoint (e.g. `[1, 2]` " +
    "and `[2, 3]` become `[1, 3]`), and the input is NOT guaranteed to be sorted. The current implementation " +
    "fails several of these cases. Fix `merge-intervals.js` so every test in `merge-intervals.test.js` passes. " +
    "Respond with ONLY the corrected, complete content of merge-intervals.js — no explanation, no markdown " +
    "code fences.",
  files: {
    "merge-intervals.js": [
      "function mergeIntervals(intervals) {",
      "  const merged = [];",
      "",
      "  for (const [start, end] of intervals) {",
      "    const last = merged[merged.length - 1];",
      "    if (last && start < last[1]) {",
      "      last[1] = Math.max(last[1], end);",
      "    } else {",
      "      merged.push([start, end]);",
      "    }",
      "  }",
      "",
      "  return merged;",
      "}",
      "",
      "module.exports = { mergeIntervals };",
      "",
    ].join("\n"),
    "merge-intervals.test.js": [
      "const { test } = require('node:test');",
      "const assert = require('node:assert');",
      "const { mergeIntervals } = require('./merge-intervals.js');",
      "",
      "test('merges overlapping intervals given in order', () => {",
      "  assert.deepStrictEqual(",
      "    mergeIntervals([[1, 3], [2, 6], [8, 10], [15, 18]]),",
      "    [[1, 6], [8, 10], [15, 18]]",
      "  );",
      "});",
      "",
      "test('sorts unordered input before merging', () => {",
      "  assert.deepStrictEqual(",
      "    mergeIntervals([[8, 10], [1, 3], [2, 6]]),",
      "    [[1, 6], [8, 10]]",
      "  );",
      "});",
      "",
      "test('merges intervals that only touch at an endpoint', () => {",
      "  assert.deepStrictEqual(mergeIntervals([[1, 2], [2, 3]]), [[1, 3]]);",
      "});",
      "",
      "test('leaves a single interval untouched', () => {",
      "  assert.deepStrictEqual(mergeIntervals([[5, 7]]), [[5, 7]]);",
      "});",
      "",
      "test('returns an empty list for no intervals', () => {",
      "  assert.deepStrictEqual(mergeIntervals([]), []);",
      "});",
      "",
    ].join("\n"),
  },
  solutionFile: "merge-intervals.js",
  testCommand: ["node", "--test", "merge-intervals.test.js"],
};

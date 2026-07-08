import { describe, expect, it } from "vitest";

import { binarySearchChallenge } from "../challenges/binary-search";
import { csvSumChallenge } from "../challenges/csv-sum";
import { isPalindromeChallenge } from "../challenges/is-palindrome";
import { mergeIntervalsChallenge } from "../challenges/merge-intervals";
import { pathTraversalChallenge } from "../challenges/path-traversal";
import { reverseWordsChallenge } from "../challenges/reverse-words";
import type { Challenge } from "../lib/challenge";
import { runChallenge } from "../lib/runner";
import { sandboxUsable } from "./sandboxSupport";

const SANDBOX = sandboxUsable();

/**
 * Every challenge's *unmodified* starter file must fail its own tests (or it
 * isn't a bug worth fixing), and a known-correct fix must pass. This is the
 * same self-check sum-range already gets in tests/runner.test.ts, generalized
 * across the rest of the catalog so adding a challenge can't accidentally
 * ship one where the "bug" doesn't actually fail, or the fix doesn't
 * actually pass.
 */
const cases: Array<{ challenge: Challenge; correctFix: string }> = [
  {
    challenge: reverseWordsChallenge,
    correctFix: [
      "function reverseWords(sentence) {",
      "  return sentence.split(' ').reverse().join(' ');",
      "}",
      "",
      "module.exports = { reverseWords };",
      "",
    ].join("\n"),
  },
  {
    challenge: isPalindromeChallenge,
    correctFix: [
      "function isPalindrome(str) {",
      "  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');",
      "  return cleaned === cleaned.split('').reverse().join('');",
      "}",
      "",
      "module.exports = { isPalindrome };",
      "",
    ].join("\n"),
  },
  {
    challenge: binarySearchChallenge,
    correctFix: [
      "function binarySearch(sortedArr, target) {",
      "  let low = 0;",
      "  let high = sortedArr.length - 1;",
      "",
      "  while (low <= high) {",
      "    const mid = Math.floor((low + high) / 2);",
      "    if (sortedArr[mid] === target) return mid;",
      "    if (sortedArr[mid] < target) {",
      "      low = mid + 1;",
      "    } else {",
      "      high = mid - 1;",
      "    }",
      "  }",
      "",
      "  return -1;",
      "}",
      "",
      "module.exports = { binarySearch };",
      "",
    ].join("\n"),
  },
  {
    challenge: mergeIntervalsChallenge,
    correctFix: [
      "function mergeIntervals(intervals) {",
      "  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);",
      "  const merged = [];",
      "",
      "  for (const [start, end] of sorted) {",
      "    const last = merged[merged.length - 1];",
      "    if (last && start <= last[1]) {",
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
  },
  {
    challenge: pathTraversalChallenge,
    correctFix: [
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "",
      "function readFileInDir(baseDir, name) {",
      "  const resolvedBase = path.resolve(baseDir);",
      "  const target = path.resolve(resolvedBase, name);",
      "  if (target !== resolvedBase && !target.startsWith(resolvedBase + path.sep)) {",
      "    throw new Error('path escapes the base directory');",
      "  }",
      "  return fs.readFileSync(target, 'utf8');",
      "}",
      "",
      "module.exports = { readFileInDir };",
      "",
    ].join("\n"),
  },
];

describe.skipIf(!SANDBOX).each(cases)("challenge: $challenge.id", ({ challenge, correctFix }) => {
  it("the unmodified buggy starter fails", async () => {
    const result = await runChallenge(challenge, challenge.files[challenge.solutionFile]!);
    expect(result.passed).toBe(false);
  }, 15_000);

  it("a correct fix passes", async () => {
    const result = await runChallenge(challenge, correctFix);
    expect(result.passed).toBe(true);
  }, 15_000);
});

/**
 * merge-intervals is deliberately a two-bug challenge. Prove it actually is:
 * each *partial* fix (only the sort, or only the touching-interval comparison)
 * must still fail. If either partial fix ever starts passing, the challenge has
 * quietly degraded into a one-line bug and this guard should catch it.
 */
describe.skipIf(!SANDBOX)("challenge: merge-intervals is genuinely two independent bugs", () => {
  const sortOnly = [
    "function mergeIntervals(intervals) {",
    "  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);",
    "  const merged = [];",
    "  for (const [start, end] of sorted) {",
    "    const last = merged[merged.length - 1];",
    "    if (last && start < last[1]) {", // still strict — misses touching intervals
    "      last[1] = Math.max(last[1], end);",
    "    } else {",
    "      merged.push([start, end]);",
    "    }",
    "  }",
    "  return merged;",
    "}",
    "module.exports = { mergeIntervals };",
    "",
  ].join("\n");

  const comparisonOnly = [
    "function mergeIntervals(intervals) {",
    "  const merged = [];",
    "  for (const [start, end] of intervals) {", // no sort — misses unordered input
    "    const last = merged[merged.length - 1];",
    "    if (last && start <= last[1]) {",
    "      last[1] = Math.max(last[1], end);",
    "    } else {",
    "      merged.push([start, end]);",
    "    }",
    "  }",
    "  return merged;",
    "}",
    "module.exports = { mergeIntervals };",
    "",
  ].join("\n");

  it("fixing only the sort still fails", async () => {
    const result = await runChallenge(mergeIntervalsChallenge, sortOnly);
    expect(result.passed).toBe(false);
  }, 15_000);

  it("fixing only the touching-interval comparison still fails", async () => {
    const result = await runChallenge(mergeIntervalsChallenge, comparisonOnly);
    expect(result.passed).toBe(false);
  }, 15_000);
});

/**
 * csv-sum is the multi-file challenge: one bug in parse.js, one in sum.js.
 * runChallenge is given a path -> content map here (the multi-file submission
 * shape); an omitted file keeps its buggy starter. Prove the full two-file fix
 * passes and every one-file fix still fails, so the challenge genuinely needs
 * both files edited.
 */
describe.skipIf(!SANDBOX)("challenge: csv-sum spans two files that both need fixing", () => {
  const fixedParse = [
    "function parse(csv) {",
    "  return csv.split(',').map(Number);",
    "}",
    "module.exports = { parse };",
    "",
  ].join("\n");

  const fixedSum = [
    "function sum(nums) {",
    "  let total = 0;",
    "  for (const n of nums) {",
    "    total += n;",
    "  }",
    "  return total;",
    "}",
    "module.exports = { sum };",
    "",
  ].join("\n");

  it("the unmodified starter (both files buggy) fails", async () => {
    const result = await runChallenge(csvSumChallenge, {});
    expect(result.passed).toBe(false);
  }, 15_000);

  it("fixing both files passes", async () => {
    const result = await runChallenge(csvSumChallenge, {
      "parse.js": fixedParse,
      "sum.js": fixedSum,
    });
    expect(result.passed).toBe(true);
  }, 15_000);

  it("fixing only parse.js still fails", async () => {
    const result = await runChallenge(csvSumChallenge, { "parse.js": fixedParse });
    expect(result.passed).toBe(false);
  }, 15_000);

  it("fixing only sum.js still fails", async () => {
    const result = await runChallenge(csvSumChallenge, { "sum.js": fixedSum });
    expect(result.passed).toBe(false);
  }, 15_000);

  it("cannot overwrite the non-editable test file to force a pass", async () => {
    // parse.js/sum.js are still buggy; an edit to the test file must be ignored,
    // so this must NOT pass — the grader can never be rewritten by a submission.
    const result = await runChallenge(csvSumChallenge, {
      "csv-sum.test.js": "const { test } = require('node:test');\ntest('noop', () => {});\n",
    });
    expect(result.passed).toBe(false);
  }, 15_000);
});

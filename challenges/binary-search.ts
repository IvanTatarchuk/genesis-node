import type { Challenge } from "../lib/challenge";

export const binarySearchChallenge: Challenge = {
  id: "binary-search",
  title: "Fix binarySearch",
  prompt:
    "The function `binarySearch(sortedArr, target)` in `binary-search.js` should return the index of " +
    "`target` in the sorted array `sortedArr`, or -1 if it isn't present. It has an off-by-one bug in how " +
    "it initializes its lower search bound, so it can never find the first element. Fix `binary-search.js` " +
    "so every test in `binary-search.test.js` passes. Respond with ONLY the corrected, complete content of " +
    "binary-search.js — no explanation, no markdown code fences.",
  files: {
    "binary-search.js": [
      "function binarySearch(sortedArr, target) {",
      "  let low = 1;",
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
    "binary-search.test.js": [
      "const { test } = require('node:test');",
      "const assert = require('node:assert');",
      "const { binarySearch } = require('./binary-search.js');",
      "",
      "const arr = [1, 3, 5, 7, 9, 11];",
      "",
      "test('finds a middle element', () => {",
      "  assert.strictEqual(binarySearch(arr, 7), 3);",
      "});",
      "",
      "test('finds the first element', () => {",
      "  assert.strictEqual(binarySearch(arr, 1), 0);",
      "});",
      "",
      "test('finds the last element', () => {",
      "  assert.strictEqual(binarySearch(arr, 11), 5);",
      "});",
      "",
      "test('returns -1 for a missing value', () => {",
      "  assert.strictEqual(binarySearch(arr, 4), -1);",
      "});",
      "",
    ].join("\n"),
  },
  solutionFile: "binary-search.js",
  testCommand: ["node", "--test", "binary-search.test.js"],
};

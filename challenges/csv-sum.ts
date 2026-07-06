import type { Challenge } from "../lib/challenge";

/**
 * The first genuinely multi-*file* challenge: the bug spans two modules, and
 * each has an independent defect pinned by a test that touches only that file,
 * plus one test that needs both. `parse.js` returns the split strings without
 * converting them to numbers; `sum.js` seeds its accumulator with `undefined`
 * so it returns `NaN`. Fixing one file alone still fails, which forces the
 * agent to edit both — exercising the multi-file `test_solution` tool
 * (`files: { path: content }`) rather than the single-blob form.
 */
export const csvSumChallenge: Challenge = {
  id: "csv-sum",
  title: "Fix parse + sum (two files)",
  prompt:
    "This challenge is split across two files. `parse(csv)` in `parse.js` should turn a comma-separated " +
    "string like \"1,2,3\" into an array of numbers, and `sum(nums)` in `sum.js` should add an array of " +
    "numbers. Each file has its own bug, and some tests need both fixed. Edit BOTH `parse.js` and `sum.js` " +
    "so every test in `csv-sum.test.js` passes. When you call test_solution, put each corrected file in " +
    "`files`, keyed by its path. Respond only via the tool — no explanation, no markdown code fences.",
  files: {
    "parse.js": [
      "function parse(csv) {",
      "  // BUG: split yields strings, not numbers",
      "  return csv.split(',');",
      "}",
      "",
      "module.exports = { parse };",
      "",
    ].join("\n"),
    "sum.js": [
      "function sum(nums) {",
      "  // BUG: accumulator starts undefined, so the total is NaN",
      "  let total;",
      "  for (const n of nums) {",
      "    total += n;",
      "  }",
      "  return total;",
      "}",
      "",
      "module.exports = { sum };",
      "",
    ].join("\n"),
    "csv-sum.test.js": [
      "const { test } = require('node:test');",
      "const assert = require('node:assert');",
      "const { parse } = require('./parse.js');",
      "const { sum } = require('./sum.js');",
      "",
      "test('parse yields numbers, not strings', () => {",
      "  assert.deepStrictEqual(parse('5,10,15'), [5, 10, 15]);",
      "});",
      "",
      "test('sum of an empty array is 0', () => {",
      "  assert.strictEqual(sum([]), 0);",
      "});",
      "",
      "test('sum of parsed csv', () => {",
      "  assert.strictEqual(sum(parse('1,2,3,4')), 10);",
      "});",
      "",
    ].join("\n"),
  },
  solutionFile: "parse.js",
  additionalSolutionFiles: ["sum.js"],
  testCommand: ["node", "--test", "csv-sum.test.js"],
};

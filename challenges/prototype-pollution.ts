import type { Challenge } from "../lib/challenge";

/**
 * Prototype pollution (CWE-1321). A recursive `merge` that walks
 * `Object.keys(source)` without guarding the special `__proto__` key: merging a
 * crafted payload like `{"__proto__":{"polluted":true}}` recurses into
 * `Object.prototype` and adds a property that then appears on *every* object.
 * The fix is the standard dangerous-key skip. Graded objectively — the test
 * merges a malicious payload and asserts a fresh `{}` did NOT inherit the
 * planted property, while normal deep-merges still work.
 */
export const prototypePollutionChallenge: Challenge = {
  id: "prototype-pollution",
  title: "Fix a prototype-pollution vulnerability",
  category: "security",
  tags: ["prototype-pollution", "cwe-1321"],
  prompt:
    "`merge(target, source)` in `merge.js` deep-merges `source` into `target`, but it's vulnerable to " +
    "prototype pollution: a payload whose key is `__proto__` (e.g. from `JSON.parse`) climbs into " +
    "`Object.prototype`, so the planted property leaks onto every object in the program. Fix `merge.js` " +
    "so it still deep-merges normally but can never write through `__proto__` (or other prototype-" +
    "reaching keys). Make every test in `merge.test.js` pass. Respond with ONLY the corrected, complete " +
    "content of merge.js — no explanation, no markdown code fences.",
  files: {
    "merge.js": [
      "function merge(target, source) {",
      "  for (const key of Object.keys(source)) {",
      "    // VULNERABLE: no guard on __proto__, so a crafted key reaches Object.prototype.",
      "    if (",
      "      source[key] && typeof source[key] === 'object' &&",
      "      target[key] && typeof target[key] === 'object'",
      "    ) {",
      "      merge(target[key], source[key]);",
      "    } else {",
      "      target[key] = source[key];",
      "    }",
      "  }",
      "  return target;",
      "}",
      "",
      "module.exports = { merge };",
      "",
    ].join("\n"),
    "merge.test.js": [
      "const { test } = require('node:test');",
      "const assert = require('node:assert');",
      "const { merge } = require('./merge.js');",
      "",
      "test('deep-merges nested objects', () => {",
      "  assert.deepStrictEqual(merge({ a: { x: 1 } }, { a: { y: 2 }, b: 3 }), { a: { x: 1, y: 2 }, b: 3 });",
      "});",
      "",
      "test('overwrites primitive values', () => {",
      "  assert.deepStrictEqual(merge({ a: 1 }, { a: 2 }), { a: 2 });",
      "});",
      "",
      "test('does not pollute Object.prototype via __proto__', () => {",
      "  merge({}, JSON.parse('{\"__proto__\":{\"polluted\":true}}'));",
      "  const leaked = ({}).polluted;",
      "  delete Object.prototype.polluted;",
      "  assert.strictEqual(leaked, undefined);",
      "});",
      "",
    ].join("\n"),
  },
  solutionFile: "merge.js",
  testCommand: ["node", "--test", "merge.test.js"],
};

import type { Challenge } from "../lib/challenge";

/**
 * Code injection via `eval` (CWE-95). `parseConfig` is meant to turn a config
 * string into an object, but it `eval`s it, so the "config" can be arbitrary
 * code that runs with the app's privileges. The fix is to parse data as data
 * (`JSON.parse`). Graded objectively — the test feeds a payload that would run
 * code and asserts it did NOT execute (and is rejected), while valid JSON still
 * parses.
 */
export const evalInjectionChallenge: Challenge = {
  id: "eval-injection",
  title: "Fix a code-injection (eval) vulnerability",
  category: "security",
  tags: ["code-injection", "cwe-95"],
  prompt:
    "`parseConfig(text)` in `parse-config.js` should turn a JSON config string into an object, but it " +
    "uses `eval`, so a malicious `text` runs arbitrary code instead of being parsed as data. Fix " +
    "`parse-config.js` so it parses the config safely — valid JSON in, object out, and anything that " +
    "isn't valid JSON is rejected rather than executed. Make every test in `parse-config.test.js` pass. " +
    "Respond with ONLY the corrected, complete content of parse-config.js — no explanation, no markdown " +
    "code fences.",
  files: {
    "parse-config.js": [
      "function parseConfig(text) {",
      "  // VULNERABLE: eval executes whatever is in `text`, not just JSON data.",
      "  return eval('(' + text + ')');",
      "}",
      "",
      "module.exports = { parseConfig };",
      "",
    ].join("\n"),
    "parse-config.test.js": [
      "const { test } = require('node:test');",
      "const assert = require('node:assert');",
      "const { parseConfig } = require('./parse-config.js');",
      "",
      "test('parses a JSON object', () => {",
      "  assert.deepStrictEqual(parseConfig('{\"a\":1,\"b\":[2,3]}'), { a: 1, b: [2, 3] });",
      "});",
      "",
      "test('does not execute code embedded in the input', () => {",
      "  const payload = '(function(){ globalThis.__pwned = true; return {}; })()';",
      "  let threw = false;",
      "  try {",
      "    parseConfig(payload);",
      "  } catch {",
      "    threw = true;",
      "  }",
      "  const pwned = globalThis.__pwned === true;",
      "  delete globalThis.__pwned;",
      "  assert.strictEqual(pwned, false, 'input must not execute');",
      "  assert.strictEqual(threw, true, 'non-JSON input must be rejected');",
      "});",
      "",
    ].join("\n"),
  },
  solutionFile: "parse-config.js",
  testCommand: ["node", "--test", "parse-config.test.js"],
};

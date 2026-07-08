import type { Challenge } from "../lib/challenge";

/**
 * The first security challenge: a path-traversal vulnerability, graded the same
 * way as any other (an objective sandboxed test) — the test just checks that an
 * *exploit* is closed rather than that a feature works. `readFileInDir` is meant
 * to read a file inside a base directory, but the starter uses `path.resolve`
 * with the caller-supplied name, so `../secret` and absolute paths escape the
 * base and read arbitrary files. The fix is the standard containment check:
 * resolve the target and confirm it stays under the resolved base. The "reads a
 * file inside" test keeps the fix honest (it must not just reject everything).
 */
export const pathTraversalChallenge: Challenge = {
  id: "path-traversal",
  title: "Fix a path-traversal vulnerability",
  category: "security",
  tags: ["path-traversal", "cwe-22"],
  prompt:
    "`readFileInDir(baseDir, name)` in `read.js` is supposed to read the file `name` from inside " +
    "`baseDir` and nowhere else. As written it has a path-traversal vulnerability: a `name` like " +
    "`../secret.txt`, or an absolute path, escapes `baseDir` and reads arbitrary files. Fix `read.js` so " +
    "it still reads legitimate files inside `baseDir` but refuses (throws) any `name` that would resolve " +
    "outside it. Make every test in `read.test.js` pass. Respond with ONLY the corrected, complete " +
    "content of read.js — no explanation, no markdown code fences.",
  files: {
    "read.js": [
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "",
      "function readFileInDir(baseDir, name) {",
      "  // VULNERABLE: path.resolve lets `name` climb out of baseDir with `..`,",
      "  // and an absolute `name` overrides baseDir entirely.",
      "  const target = path.resolve(baseDir, name);",
      "  return fs.readFileSync(target, 'utf8');",
      "}",
      "",
      "module.exports = { readFileInDir };",
      "",
    ].join("\n"),
    "read.test.js": [
      "const { test } = require('node:test');",
      "const assert = require('node:assert');",
      "const fs = require('node:fs');",
      "const os = require('node:os');",
      "const path = require('node:path');",
      "const { readFileInDir } = require('./read.js');",
      "",
      "// A base directory with a legitimate file, and a secret file OUTSIDE it.",
      "const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-'));",
      "const base = path.join(root, 'public');",
      "fs.mkdirSync(base);",
      "fs.writeFileSync(path.join(base, 'note.txt'), 'hello');",
      "fs.writeFileSync(path.join(root, 'secret.txt'), 'TOP SECRET');",
      "",
      "test('reads a file inside the base directory', () => {",
      "  assert.strictEqual(readFileInDir(base, 'note.txt'), 'hello');",
      "});",
      "",
      "test('refuses to escape the base directory with ..', () => {",
      "  assert.throws(() => readFileInDir(base, '../secret.txt'));",
      "});",
      "",
      "test('refuses an absolute path outside the base directory', () => {",
      "  assert.throws(() => readFileInDir(base, path.join(root, 'secret.txt')));",
      "});",
      "",
    ].join("\n"),
  },
  solutionFile: "read.js",
  testCommand: ["node", "--test", "read.test.js"],
};

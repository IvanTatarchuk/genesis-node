import type { Challenge } from "../lib/challenge";

export const reverseWordsChallenge: Challenge = {
  id: "reverse-words",
  title: "Fix reverseWords",
  prompt:
    "The function `reverseWords(sentence)` in `reverse-words.js` should reverse the ORDER of the words " +
    "in a sentence, keeping each word intact (e.g. 'hello world' -> 'world hello'). It currently reverses " +
    "the characters of the whole string instead. Fix `reverse-words.js` so every test in " +
    "`reverse-words.test.js` passes. Respond with ONLY the corrected, complete content of " +
    "reverse-words.js — no explanation, no markdown code fences.",
  files: {
    "reverse-words.js": [
      "function reverseWords(sentence) {",
      "  return sentence.split('').reverse().join('');",
      "}",
      "",
      "module.exports = { reverseWords };",
      "",
    ].join("\n"),
    "reverse-words.test.js": [
      "const { test } = require('node:test');",
      "const assert = require('node:assert');",
      "const { reverseWords } = require('./reverse-words.js');",
      "",
      "test(\"reverses two words\", () => {",
      "  assert.strictEqual(reverseWords('hello world'), 'world hello');",
      "});",
      "",
      "test(\"reverses four words\", () => {",
      "  assert.strictEqual(reverseWords('the quick brown fox'), 'fox brown quick the');",
      "});",
      "",
      "test(\"single word is unchanged\", () => {",
      "  assert.strictEqual(reverseWords('single'), 'single');",
      "});",
      "",
    ].join("\n"),
  },
  solutionFile: "reverse-words.js",
  testCommand: ["node", "--test", "reverse-words.test.js"],
};

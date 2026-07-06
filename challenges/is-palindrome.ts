import type { Challenge } from "../lib/challenge";

export const isPalindromeChallenge: Challenge = {
  id: "is-palindrome",
  title: "Fix isPalindrome",
  prompt:
    "The function `isPalindrome(str)` in `is-palindrome.js` should return true if `str` is a palindrome, " +
    "ignoring letter case AND ignoring any character that isn't a letter or digit (spaces, punctuation, " +
    "etc). It currently only lowercases the string, so it fails on anything with spaces or punctuation. " +
    "Fix `is-palindrome.js` so every test in `is-palindrome.test.js` passes. Respond with ONLY the " +
    "corrected, complete content of is-palindrome.js — no explanation, no markdown code fences.",
  files: {
    "is-palindrome.js": [
      "function isPalindrome(str) {",
      "  const cleaned = str.toLowerCase();",
      "  return cleaned === cleaned.split('').reverse().join('');",
      "}",
      "",
      "module.exports = { isPalindrome };",
      "",
    ].join("\n"),
    "is-palindrome.test.js": [
      "const { test } = require('node:test');",
      "const assert = require('node:assert');",
      "const { isPalindrome } = require('./is-palindrome.js');",
      "",
      "test('simple palindrome', () => {",
      "  assert.strictEqual(isPalindrome('racecar'), true);",
      "});",
      "",
      "test('palindrome with spaces and punctuation', () => {",
      "  assert.strictEqual(isPalindrome('A man, a plan, a canal: Panama'), true);",
      "});",
      "",
      "test('non-palindrome', () => {",
      "  assert.strictEqual(isPalindrome('hello'), false);",
      "});",
      "",
    ].join("\n"),
  },
  solutionFile: "is-palindrome.js",
  testCommand: ["node", "--test", "is-palindrome.test.js"],
};

import { describe, expect, it } from "vitest";

import { binarySearchChallenge } from "../challenges/binary-search";
import { isPalindromeChallenge } from "../challenges/is-palindrome";
import { reverseWordsChallenge } from "../challenges/reverse-words";
import type { Challenge } from "../lib/challenge";
import { runChallenge } from "../lib/runner";

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
];

describe.each(cases)("challenge: $challenge.id", ({ challenge, correctFix }) => {
  it("the unmodified buggy starter fails", async () => {
    const result = await runChallenge(challenge, challenge.files[challenge.solutionFile]!);
    expect(result.passed).toBe(false);
  }, 15_000);

  it("a correct fix passes", async () => {
    const result = await runChallenge(challenge, correctFix);
    expect(result.passed).toBe(true);
  }, 15_000);
});

import { describe, expect, it } from "vitest";

import { csvSumChallenge } from "../challenges/csv-sum";
import { sumRangeChallenge } from "../challenges/sum-range";
import type { Challenge } from "../lib/challenge";
import {
  appendResult,
  challengeHash,
  exportLedger,
  GENESIS_HASH,
  importLedger,
  type ResultInput,
  type ResultRecord,
  strategyHash,
  submissionHash,
  verifyChain,
} from "../lib/ledger";

function makeInput(overrides: Partial<ResultInput> = {}): ResultInput {
  return {
    challengeHash: challengeHash(sumRangeChallenge),
    model: "claude-haiku-4-5",
    strategyHash: strategyHash(undefined),
    submissionHash: submissionHash({ "sum.js": "x" }),
    passed: true,
    iterations: 1,
    durationMs: 42,
    playerName: "ivan",
    timestamp: "2026-07-06T00:00:00.000Z",
    ...overrides,
  };
}

function buildChain(...inputs: ResultInput[]): ResultRecord[] {
  const records: ResultRecord[] = [];
  let prev: ResultRecord | null = null;
  for (const input of inputs) {
    prev = appendResult(prev, input);
    records.push(prev);
  }
  return records;
}

describe("content-address hashing", () => {
  it("is deterministic — the same challenge always hashes the same", () => {
    expect(challengeHash(sumRangeChallenge)).toBe(challengeHash(sumRangeChallenge));
  });

  it("is independent of file insertion order", () => {
    const a: Challenge = {
      id: "x",
      title: "x",
      prompt: "",
      files: { "a.js": "A", "a.test.js": "T" },
      solutionFile: "a.js",
      testCommand: ["node", "--test", "a.test.js"],
    };
    const b: Challenge = { ...a, files: { "a.test.js": "T", "a.js": "A" } };
    expect(challengeHash(a)).toBe(challengeHash(b));
  });

  it("differs when the graded content differs", () => {
    expect(challengeHash(sumRangeChallenge)).not.toBe(challengeHash(csvSumChallenge));
  });

  it("distinguishes 'no strategy' from a real one, and trims", () => {
    expect(strategyHash(undefined)).toBe(strategyHash("   "));
    expect(strategyHash("check bounds")).toBe(strategyHash("  check bounds  "));
    expect(strategyHash("check bounds")).not.toBe(strategyHash(undefined));
  });

  it("hashes submissions by content", () => {
    expect(submissionHash({ "a.js": "1" })).toBe(submissionHash({ "a.js": "1" }));
    expect(submissionHash({ "a.js": "1" })).not.toBe(submissionHash({ "a.js": "2" }));
  });
});

describe("hash chaining", () => {
  it("roots the first record at the genesis hash", () => {
    const [first] = buildChain(makeInput());
    expect(first!.prevHash).toBe(GENESIS_HASH);
  });

  it("links each record to the previous one's hash", () => {
    const chain = buildChain(makeInput(), makeInput({ playerName: "mira" }));
    expect(chain[1]!.prevHash).toBe(chain[0]!.recordHash);
  });
});

describe("verifyChain", () => {
  it("accepts a well-formed chain (and an empty one)", () => {
    expect(verifyChain([]).ok).toBe(true);
    expect(verifyChain(buildChain(makeInput(), makeInput({ passed: false }))).ok).toBe(true);
  });

  it("detects a tampered field in a past record", () => {
    const chain = buildChain(makeInput({ passed: false }), makeInput());
    // Flip a recorded result without recomputing hashes — the classic forgery.
    const forged = structuredClone(chain);
    forged[0]!.passed = true;
    const result = verifyChain(forged);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.brokenAt).toBe(0);
  });

  it("detects a reordered chain", () => {
    const chain = buildChain(makeInput({ playerName: "a" }), makeInput({ playerName: "b" }));
    const result = verifyChain([chain[1]!, chain[0]!]);
    expect(result.ok).toBe(false);
  });

  it("detects a deleted record", () => {
    const chain = buildChain(makeInput(), makeInput({ playerName: "b" }), makeInput({ playerName: "c" }));
    const result = verifyChain([chain[0]!, chain[2]!]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.brokenAt).toBe(1);
  });
});

describe("export / import", () => {
  it("round-trips a chain that still verifies", () => {
    const chain = buildChain(makeInput(), makeInput({ model: "claude-opus-4-8" }));
    const reimported = importLedger(exportLedger(chain));
    expect(reimported).toEqual(chain);
    expect(verifyChain(reimported).ok).toBe(true);
  });

  it("rejects a malformed ledger", () => {
    expect(() => importLedger("{}")).toThrow(/invalid ledger/);
  });
});

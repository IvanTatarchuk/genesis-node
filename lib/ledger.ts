/**
 * A tamper-evident, hash-chained ledger of arena results — the "make it a
 * benchmark, not just an app" cornerstone.
 *
 * The durable value of Agent Arena isn't the website; it's the record of
 * "challenge X, model Y, strategy Z → passed/failed in N attempts", because
 * that record is a citable dataset that outlives any single model or host. To
 * be worth citing it has to be trustworthy, and this module borrows the parts
 * of Bitcoin's design that make its history trustworthy:
 *
 *   1. Content-addressing — a challenge, strategy, and submission are each
 *      identified by the hash of their own content (`challengeHash` etc.), so a
 *      reference is immutable and independent of any database id.
 *   2. Hash chaining — each result record commits to the previous record's
 *      hash (`prevHash`), so the history is append-only: altering or reordering
 *      any past record changes every hash after it, and `verifyChain` catches
 *      it. This is Bitcoin's block chain applied to results.
 *
 * What it deliberately does NOT borrow — because a benchmark doesn't need them
 * the way money does — is proof-of-work, a coin, or global consensus. Money is
 * not independently reproducible, so Bitcoin needs miners to agree on truth. A
 * coding result *is* reproducible: anyone can re-run the recorded submission
 * against the content-addressed challenge in the sandbox and check the pass/fail
 * for themselves (see `lib/runner.ts`). Truth here is established by
 * re-execution, not by mining — so this gets Bitcoin's trustless verification
 * without the energy, the token, or the regulatory surface.
 *
 * This file is pure and dependency-light on purpose (only node:crypto), so the
 * ledger logic is fully unit-testable without a database or any credentials.
 * Persisting the chain (a Postgres table, an export endpoint, per-record
 * signatures) layers on top; the integrity guarantees live here.
 */

import { createHash } from "node:crypto";

import { editableFiles, type Challenge } from "./challenge";

/** The root every chain starts from — 32 zero bytes, like a genesis prev-hash. */
export const GENESIS_HASH = "0".repeat(64);

/**
 * Deterministic, order-independent serialization: object keys are sorted so two
 * logically-equal objects serialize identically, while array order is preserved
 * (it's significant — e.g. a testCommand's arguments). This is what makes a hash
 * a stable fingerprint of *content* rather than of incidental key ordering.
 */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const obj = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(obj)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(obj[k]))
      .join(",") +
    "}"
  );
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Content-address a challenge by what actually determines a run's outcome: its
 * files, its editable set (order-independent), and its grading command. Two
 * challenges that grade identically hash identically, regardless of how their
 * files happened to be ordered or which id a database gave them.
 */
export function challengeHash(challenge: Challenge): string {
  return sha256(
    "challenge:" +
      canonical({
        files: challenge.files,
        editable: [...editableFiles(challenge)].sort(),
        testCommand: challenge.testCommand,
      })
  );
}

/** Content-address a strategy (trimmed; "none" is its own stable hash), so a
 * result commits to exactly the guidance the agent was given. */
export function strategyHash(strategy: string | undefined): string {
  const normalized = strategy?.trim() ? strategy.trim() : null;
  return sha256("strategy:" + canonical(normalized));
}

/** Content-address a submission (the path -> content the agent produced). */
export function submissionHash(submission: Record<string, string>): string {
  return sha256("submission:" + canonical(submission));
}

/** The facts of one graded run, before it's chained into the ledger. */
export interface ResultInput {
  challengeHash: string;
  model: string;
  strategyHash: string;
  submissionHash: string;
  passed: boolean;
  iterations: number;
  durationMs: number;
  playerName: string;
  /** ISO 8601. Caller-supplied so records are reproducible/verifiable offline. */
  timestamp: string;
}

/** A ledger entry: the run's facts, its link to the prior entry, and its hash. */
export interface ResultRecord extends ResultInput {
  prevHash: string;
  recordHash: string;
}

// Hashes exactly the ResultInput fields (ignoring any extra props on a full
// record, e.g. prevHash/recordHash), so verifyChain can pass a ResultRecord in
// directly without stripping.
function computeRecordHash(prevHash: string, r: ResultInput): string {
  return sha256(
    "record:" +
      prevHash +
      ":" +
      canonical({
        challengeHash: r.challengeHash,
        model: r.model,
        strategyHash: r.strategyHash,
        submissionHash: r.submissionHash,
        passed: r.passed,
        iterations: r.iterations,
        durationMs: r.durationMs,
        playerName: r.playerName,
        timestamp: r.timestamp,
      })
  );
}

/**
 * Append a result to the chain. The new record commits to `prev`'s hash (or the
 * genesis root for the first record), so the whole history is append-only.
 */
export function appendResult(prev: ResultRecord | null, input: ResultInput): ResultRecord {
  const prevHash = prev ? prev.recordHash : GENESIS_HASH;
  return { ...input, prevHash, recordHash: computeRecordHash(prevHash, input) };
}

export type ChainVerification =
  | { ok: true }
  | { ok: false; brokenAt: number; reason: string };

/**
 * Verify a chain end to end: every record's hash must recompute from its own
 * content, and its `prevHash` must equal the previous record's hash (genesis
 * for the first). Any edit, insertion, deletion, or reorder of a past record
 * breaks this — that's the tamper-evidence. Returns the first broken index so a
 * verifier can point at exactly where history was altered.
 */
export function verifyChain(records: ResultRecord[]): ChainVerification {
  let prevHash = GENESIS_HASH;
  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;
    if (record.prevHash !== prevHash) {
      return { ok: false, brokenAt: i, reason: "prevHash does not link to the previous record" };
    }
    if (computeRecordHash(prevHash, record) !== record.recordHash) {
      return { ok: false, brokenAt: i, reason: "recordHash does not match the record's content" };
    }
    prevHash = record.recordHash;
  }
  return { ok: true };
}

/** Serialize the chain for publishing/audit — anyone can re-import and verify. */
export function exportLedger(records: ResultRecord[]): string {
  return JSON.stringify({ version: 1, records }, null, 2);
}

/** Parse an exported ledger. Does NOT trust it — run `verifyChain` on the result. */
export function importLedger(json: string): ResultRecord[] {
  const parsed = JSON.parse(json) as { version?: number; records?: ResultRecord[] };
  if (!parsed || !Array.isArray(parsed.records)) {
    throw new Error("invalid ledger: expected { records: [...] }");
  }
  return parsed.records;
}

import type { Challenge } from "./challenge";
import { challengeList, challenges as builtInChallenges } from "../challenges";
import { fetchApprovedChallenges, fetchChallengeBySlug, insertChallengeSubmission } from "./supabase";

export interface ChallengeMeta {
  id: string;
  title: string;
  prompt: string;
  authorName: string | null;
}

export interface ChallengeSubmissionInput {
  slug: string;
  authorName: string;
  title: string;
  prompt: string;
  files: Record<string, string>;
  solutionFile: string;
  /** Must be exactly ["node", "--test", "<a .test.js file from `files`>"] — see validateSubmission. */
  testCommand: string[];
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * A player-authored challenge's test command runs inside the sandbox for
 * every other player who attempts it — it is not treated as free-form shell.
 * Only the same invocation shape the built-in challenges themselves use
 * (`node --test <file>`) is accepted, and that file must be one the author
 * actually submitted. This rules out `rm -rf`, curl loops, shell fork-bomb
 * idioms, etc. at submission time; it does not prevent a malicious *test
 * file's* JS from misbehaving once node runs it, which is what the
 * sandbox's network/filesystem isolation and the moderation gate below are
 * for (see lib/sandbox.ts's module docstring for the known limits there).
 */
export function validateSubmission(input: ChallengeSubmissionInput): string | null {
  if (!SLUG_PATTERN.test(input.slug)) {
    return "slug must be lowercase letters, numbers, and hyphens only (e.g. my-challenge)";
  }
  if (builtInChallenges[input.slug]) {
    return `slug "${input.slug}" collides with a built-in challenge`;
  }
  if (!input.authorName.trim()) return "authorName is required";
  if (!input.title.trim()) return "title is required";
  if (!input.prompt.trim()) return "prompt is required";
  if (Object.keys(input.files).length === 0) return "files must not be empty";
  if (!(input.solutionFile in input.files)) return "solutionFile must be a key in files";

  const [cmd, flag, testFile] = input.testCommand;
  if (input.testCommand.length !== 3 || cmd !== "node" || flag !== "--test") {
    return 'testCommand must be exactly ["node", "--test", "<file>"]';
  }
  if (!testFile || !(testFile in input.files)) {
    return "testCommand's file must be a key in files";
  }
  if (!testFile.endsWith(".test.js")) {
    return "testCommand's file must end in .test.js";
  }

  return null;
}

export async function submitChallenge(input: ChallengeSubmissionInput): Promise<string> {
  const error = validateSubmission(input);
  if (error) throw new Error(error);

  return insertChallengeSubmission(input);
}

/**
 * Built-ins first (fast, no DB round trip, always available even if
 * Supabase isn't configured), then approved player-authored ones.
 */
export async function listChallengeMetadata(): Promise<ChallengeMeta[]> {
  const builtIn: ChallengeMeta[] = challengeList.map((c) => ({
    id: c.id,
    title: c.title,
    prompt: c.prompt,
    authorName: null,
  }));

  let custom: ChallengeMeta[] = [];
  try {
    const approved = await fetchApprovedChallenges();
    custom = approved.map((c) => ({
      id: c.slug,
      title: c.title,
      prompt: c.prompt,
      authorName: c.author_name,
    }));
  } catch {
    // Supabase not configured, or unreachable — built-ins alone still work.
  }

  return [...builtIn, ...custom];
}

/**
 * Resolves a challenge id to its full definition for running: built-ins are
 * looked up in memory; anything else is looked up by slug in Supabase,
 * regardless of moderation status, so an author can test-run their own
 * pending submission (see supabase/schema.sql's RLS comment for why that's
 * safe — this always goes through the service-role client, which isn't
 * gated by the "approved only" read policy meant for anon-key access).
 */
export async function resolveChallenge(
  id: string
): Promise<{ challenge: Challenge; authorName: string | null }> {
  const builtIn = builtInChallenges[id];
  if (builtIn) return { challenge: builtIn, authorName: null };

  const row = await fetchChallengeBySlug(id);
  if (!row) throw new Error(`unknown challenge id: ${id}`);

  return {
    challenge: {
      id: row.slug,
      title: row.title,
      prompt: row.prompt,
      files: row.files,
      solutionFile: row.solution_file,
      testCommand: row.test_command,
    },
    authorName: row.author_name,
  };
}

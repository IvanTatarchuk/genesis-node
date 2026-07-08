/**
 * A "challenge" is a small, self-contained coding task: starter files (which
 * include a failing test), a prompt describing what needs to fix, and the
 * command used to grade a submission. No partial credit — just "does the test
 * suite pass after the agent's patch."
 *
 * Most challenges are single-file (`solutionFile`), but a challenge may declare
 * extra editable files via `additionalSolutionFiles` for a bug that genuinely
 * spans more than one module. Everything else in the pipeline (`applySolution`,
 * the runner, the agent loop) treats the editable set uniformly, so the
 * single-file case is just the one-entry case.
 */
/**
 * A challenge is either a plain correctness bug or a security vulnerability.
 * Security challenges are graded exactly like the rest (an objective sandboxed
 * test), but the test checks that an *exploit* is closed rather than that a
 * feature works — which is what makes this a security platform without new
 * infrastructure. The category also lets the UI label them and lets a breaker
 * (see lib/roles.ts) filter to the traps they care about.
 */
export type ChallengeCategory = "correctness" | "security";

export interface Challenge {
  id: string;
  title: string;
  /** Defaults to "correctness" when unset (see `challengeCategory`). */
  category?: ChallengeCategory;
  /** Freeform labels, e.g. a vulnerability class like "path-traversal". */
  tags?: string[];
  /** Given to the agent as the task description. */
  prompt: string;
  /** Relative path -> file content, written into the run's working directory verbatim. */
  files: Record<string, string>;
  /** The primary file the agent is allowed to replace with its own solution. */
  solutionFile: string;
  /**
   * Extra files the agent may also edit, for a multi-file challenge. The full
   * editable set is `solutionFile` plus these (see `editableFiles`). Anything
   * *not* in that set — the test file, in particular — can never be overwritten
   * by a submission, so the agent can't trivially "fix" a challenge by rewriting
   * its tests.
   */
  additionalSolutionFiles?: string[];
  /** Command run inside the sandbox to grade the submission, e.g. ["node", "--test", "sum.test.js"]. */
  testCommand: string[];
}

/** A challenge's category, defaulting to "correctness" when unspecified. */
export function challengeCategory(challenge: Challenge): ChallengeCategory {
  return challenge.category ?? "correctness";
}

/** The full set of files a submission is allowed to replace, primary first. */
export function editableFiles(challenge: Challenge): string[] {
  return challenge.additionalSolutionFiles
    ? [challenge.solutionFile, ...challenge.additionalSolutionFiles]
    : [challenge.solutionFile];
}

/**
 * Apply a submission over the challenge's starter files. Accepts either a bare
 * string (shorthand for "this is the content of the single primary
 * `solutionFile`") or a map of path -> content for multi-file challenges. Only
 * paths in the editable set are applied; edits to any other file (e.g. the test
 * file) are ignored, so a submission can never overwrite the grader. Editable
 * files the submission doesn't mention keep their original starter content, so
 * each grading run starts fresh from the challenge's files.
 */
export function applySolution(
  challenge: Challenge,
  solution: string | Record<string, string>
): Record<string, string> {
  const edits =
    typeof solution === "string" ? { [challenge.solutionFile]: solution } : solution;
  const editable = new Set(editableFiles(challenge));

  const result = { ...challenge.files };
  for (const [path, content] of Object.entries(edits)) {
    if (editable.has(path)) result[path] = content;
  }
  return result;
}

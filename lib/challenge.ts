/**
 * A "challenge" is a small, self-contained coding task: starter files (which
 * include a failing test), a prompt describing what needs to fix, and the
 * command used to grade a submission. Deliberately minimal for the first
 * vertical slice — no partial credit, no multi-file diffs yet, just "does the
 * test suite pass after the agent's patch."
 */
export interface Challenge {
  id: string;
  title: string;
  /** Given to the agent as the task description. */
  prompt: string;
  /** Relative path -> file content, written into the run's working directory verbatim. */
  files: Record<string, string>;
  /** The one file the agent is allowed to replace with its own solution. */
  solutionFile: string;
  /** Command run inside the sandbox to grade the submission, e.g. ["node", "--test", "sum.test.js"]. */
  testCommand: string[];
}

export function applySolution(challenge: Challenge, solutionContent: string): Record<string, string> {
  return {
    ...challenge.files,
    [challenge.solutionFile]: solutionContent,
  };
}

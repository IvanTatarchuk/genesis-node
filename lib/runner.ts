import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import { applySolution, type Challenge } from "./challenge";
import { buildChallengeRunCommand } from "./sandbox";

const execFileAsync = promisify(execFile);

export interface RunResult {
  passed: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
}

/**
 * Grade a `submission` against `challenge`: write it into a seed
 * directory alongside the challenge's other files, run the test command
 * inside the sandbox, and report pass/fail plus captured output.
 *
 * `submission` is either the content of the single primary solution file (a
 * bare string) or a path -> content map for a multi-file challenge; see
 * `applySolution`. Deliberately decoupled from how it was produced — an LLM
 * call (see lib/agentLoop.ts), a human pasting code, or a fixture in a test
 * can all use this the same way.
 */
export async function runChallenge(
  challenge: Challenge,
  submission: string | Record<string, string>
): Promise<RunResult> {
  const seedDir = mkdtempSync(join("/var/tmp", `agent-arena-${challenge.id}-`));
  const startedAt = Date.now();

  try {
    const files = applySolution(challenge, submission);
    for (const [relativePath, content] of Object.entries(files)) {
      const fullPath = join(seedDir, relativePath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content);
    }

    const [cmd, ...args] = buildChallengeRunCommand(seedDir, challenge.testCommand);
    if (!cmd) {
      throw new Error("buildChallengeRunCommand returned an empty command");
    }

    try {
      const { stdout, stderr } = await execFileAsync(cmd, args, {
        timeout: 30_000,
      });
      return { passed: true, durationMs: Date.now() - startedAt, stdout, stderr };
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return {
        passed: false,
        durationMs: Date.now() - startedAt,
        stdout: execError.stdout ?? "",
        stderr: execError.stderr ?? String(error),
      };
    }
  } finally {
    rmSync(seedDir, { recursive: true, force: true });
  }
}

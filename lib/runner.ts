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
 * Grade `solutionContent` against `challenge`: write it into a seed
 * directory alongside the challenge's other files, run the test command
 * inside the sandbox, and report pass/fail plus captured output.
 *
 * Deliberately decoupled from how `solutionContent` was produced — an LLM
 * call (see lib/agent.ts), a human pasting code, or a fixture in a test can
 * all use this the same way.
 */
export async function runChallenge(challenge: Challenge, solutionContent: string): Promise<RunResult> {
  const seedDir = mkdtempSync(join("/var/tmp", `agent-arena-${challenge.id}-`));
  const startedAt = Date.now();

  try {
    const files = applySolution(challenge, solutionContent);
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

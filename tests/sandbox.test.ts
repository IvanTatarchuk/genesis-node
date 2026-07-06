import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

import { buildChallengeRunCommand, buildSandboxedCommand } from "../lib/sandbox";

const execFileAsync = promisify(execFile);

// Deliberately NOT os.tmpdir() (which is /tmp on Linux) — the sandbox mounts a
// fresh tmpfs at /tmp, which would hide anything seeded from there. See the
// module docstring in lib/sandbox.ts.
function makeSeedDir(): string {
  return mkdtempSync(join("/var/tmp", "aa-seed-"));
}

function run(argv: string[]) {
  const [cmd, ...args] = argv;
  if (!cmd) throw new Error("empty argv");
  return execFileAsync(cmd, args);
}

describe("sandbox", () => {
  it("blocks outbound network access", async () => {
    const probe =
      "const net=require('net');const s=net.connect(53,'8.8.8.8');" +
      "s.setTimeout(2000);" +
      "s.on('connect',()=>{console.log('CONNECTED');process.exit(0)});" +
      "s.on('error',(e)=>{console.log('BLOCKED:',e.code);process.exit(1)});" +
      "s.on('timeout',()=>{console.log('BLOCKED: timeout');process.exit(1)});";

    const command = buildSandboxedCommand(["node", "-e", probe]);

    await expect(run(command)).rejects.toMatchObject({
      stdout: expect.stringContaining("BLOCKED"),
    });
  });

  it("seeds /tmp/work from the seed directory and runs the test command there", async () => {
    const seedDir = makeSeedDir();
    writeFileSync(join(seedDir, "greeting.txt"), "hello from the seed\n");

    try {
      const command = buildChallengeRunCommand(seedDir, ["cat", "greeting.txt"]);
      const { stdout } = await run(command);

      expect(stdout).toBe("hello from the seed\n");
    } finally {
      rmSync(seedDir, { recursive: true, force: true });
    }
  });

  it("blocks writes outside /tmp even though the seed directory is readable", async () => {
    const seedDir = makeSeedDir();
    const canary = join(seedDir, "..", "escape-attempt.txt");

    try {
      const command = buildChallengeRunCommand(seedDir, [
        "sh",
        "-c",
        `echo bad > ${JSON.stringify(canary)}`,
      ]);

      await expect(run(command)).rejects.toBeTruthy();
      expect(existsSync(canary)).toBe(false);
    } finally {
      rmSync(seedDir, { recursive: true, force: true });
    }
  });

  it("rejects a seed directory under /tmp before ever running anything", () => {
    expect(() => buildChallengeRunCommand("/tmp/whatever", ["true"])).toThrow(/must not be under \/tmp/);
  });
});

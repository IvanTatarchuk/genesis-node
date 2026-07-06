import { spawnSync } from "node:child_process";

import { buildSandboxedCommand } from "../lib/sandbox";

/**
 * Whether this host can actually create the namespaces the sandbox needs.
 *
 * `lib/sandbox.ts`'s own `checkUnshareAvailable` only proves the `unshare`
 * *binary* exists — not that the kernel will let an unprivileged process create
 * mount/net/pid namespaces. On a GitHub Actions runner the binary is present but
 * the operation is denied (`unshare: Operation not permitted`), so the real
 * sandbox tests can't run there. This probe actually runs a trivial sandboxed
 * command and reports whether it succeeded, so those tests can be skipped where
 * the sandbox is unusable and run in full where it works (local dev, or any host
 * with the privileges). Memoized — the probe forks a process, so do it once.
 */
let cached: boolean | undefined;

export function sandboxUsable(): boolean {
  if (cached !== undefined) return cached;

  try {
    const [cmd, ...args] = buildSandboxedCommand(["true"]);
    if (!cmd) {
      cached = false;
      return cached;
    }
    const result = spawnSync(cmd, args, { timeout: 10_000 });
    cached = result.error === undefined && result.status === 0;
  } catch {
    cached = false;
  }

  if (!cached) {
    // Surface the reason in test output (CI logs in particular) so a run that
    // skips the sandbox suites doesn't look like it silently dropped coverage.
    console.warn(
      "[tests] sandbox (`unshare` namespaces) unusable on this host — skipping sandbox-dependent suites."
    );
  }
  return cached;
}

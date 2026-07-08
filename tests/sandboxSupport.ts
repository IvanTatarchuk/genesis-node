import { probeSandbox } from "../lib/sandbox";

/**
 * Whether this host can actually create the namespaces the sandbox needs.
 *
 * Wraps `lib/sandbox.ts`'s `probeSandbox` (which actually runs a trivial
 * sandboxed command) and memoizes it — the probe forks a process, so do it
 * once. Where it returns false (a stock GitHub Actions runner, where `unshare`
 * is present but `Operation not permitted`), the sandbox-dependent suites skip
 * rather than fail; where it works (local dev, this repo's container) they run
 * in full.
 */
let cached: boolean | undefined;

export function sandboxUsable(): boolean {
  if (cached !== undefined) return cached;

  const { ok, detail } = probeSandbox();
  cached = ok;

  if (!cached) {
    console.warn(
      `[tests] sandbox (\`unshare\` namespaces) unusable on this host — skipping sandbox-dependent suites (${detail}).`
    );
  }
  return cached;
}

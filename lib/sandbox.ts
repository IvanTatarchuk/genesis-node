/**
 * Sandboxed command execution for running agent-submitted code.
 *
 * Direct TypeScript port of the isolation strategy validated in mcp-guard
 * (github.com/IvanTatarchuk/MyBotAI_Updates): pure `unshare` (util-linux), no
 * Docker/bubblewrap dependency.
 *
 * - `--net`: fresh, empty network namespace — no outbound access at all.
 * - `--mount` + a bind-remount of every real mountpoint as read-only (walking
 *   /proc/self/mountinfo, not just `/`) — covers separately-mounted
 *   filesystems too, not only whatever's mounted at the working directory.
 * - `/tmp` is a fresh tmpfs — real, writable scratch space.
 * - `--pid` + `--mount-proc`: separate process namespace. This also bounds a
 *   fork bomb's *lifetime*: when the sandboxed process is killed (e.g. by
 *   lib/runner.ts's execFile timeout), the kernel tears down the whole pid
 *   namespace and every process in it dies with it — nothing survives past
 *   the timeout as an orphan.
 *
 * Known gap: this does NOT bound a fork bomb's resource usage *during* that
 * window. `ulimit -p`/`-u` (RLIMIT_NPROC) was tried and does not help here —
 * everything in this container runs as root, and Linux exempts
 * CAP_SYS_RESOURCE processes from RLIMIT_NPROC entirely (verified: setting
 * `ulimit -p 64` and then forking 200 processes succeeded outright). A real
 * fix needs cgroups (pids/memory controllers) applied from outside this
 * process — e.g. `--pids-limit`/`--memory` if this app is itself deployed in
 * a container — which is why lib/challengeSource.ts additionally restricts
 * what a player-authored testCommand is allowed to be, rather than accepting
 * arbitrary shell.
 *   Built-in challenges never needed this (their test commands are
 *   hand-written by us), but player-authored challenges bring their own
 *   test command, so a fork-bomb-style resource exhaustion is now a real
 *   input, not just a theoretical one — bounded here, on top of the 30s
 *   execFile timeout in lib/runner.ts.
 *
 * Unlike mcp-guard's probe (which only needs *a* scratch space), a challenge
 * run needs the sandbox pre-seeded with the challenge's starter files. Since
 * mounting a fresh tmpfs at /tmp necessarily starts empty, the seed directory
 * is copied in from the (read-only) host path *inside* the sandboxed command,
 * after /tmp exists but before the real command runs — which means the seed
 * directory itself must NOT be under /tmp on the host, or the fresh tmpfs
 * mount hides it before the copy ever runs (caught by a failing test; see
 * tests/sandbox.test.ts). Use `/var/tmp` or a project-local directory instead.
 */

import { spawnSync } from "node:child_process";

export class SandboxUnavailable extends Error {}

const FS_ISOLATION_SCRIPT = String.raw`
set -e
ulimit -p 64
mount --make-rprivate /
mount --bind / /
mount -o remount,bind,ro /
mount -t tmpfs tmpfs /tmp
awk -F' - ' '{split($1,a," "); split($2,b," "); print a[5], b[1]}' /proc/self/mountinfo |
while read -r mp fstype; do
  case "$fstype" in
    proc|sysfs|devpts|cgroup2|cgroup|devtmpfs|mqueue|tracefs|debugfs|securityfs) continue ;;
    pstore|bpf|autofs|hugetlbfs|fusectl|configfs|binfmt_misc) continue ;;
  esac
  [ "$mp" = "/tmp" ] && continue
  mount -o remount,bind,ro "$mp" 2>/dev/null || true
done
exec "$@"
`;

export function describeSandbox(): string {
  return (
    "network-isolated (`unshare --net`, no outbound access) and filesystem-isolated " +
    "(rootfs + every submount bind-remounted read-only, tmpfs scratch at /tmp)"
  );
}

let unshareAvailable: boolean | undefined;

function checkUnshareAvailable(): void {
  if (unshareAvailable === undefined) {
    unshareAvailable = spawnSync("unshare", ["--version"]).error === undefined;
  }
  if (!unshareAvailable) {
    throw new SandboxUnavailable(
      "`unshare` (from util-linux) was not found on PATH. It's required to sandbox " +
        "a run. Install util-linux, or don't run challenges on this host."
    );
  }
}

/**
 * Build an argv array that runs `command` sandboxed. Throws
 * SandboxUnavailable if `unshare` cannot be located (callers must refuse to
 * run rather than silently fall back to unsandboxed execution).
 */
export function buildSandboxedCommand(command: string[]): string[] {
  checkUnshareAvailable();

  return [
    "unshare",
    "--mount",
    "--net",
    "--pid",
    "--mount-proc",
    "--fork",
    "--",
    "sh",
    "-c",
    FS_ISOLATION_SCRIPT,
    "sh",
    ...command,
  ];
}

/**
 * Build the sandboxed command for a challenge run specifically: seed a fresh
 * `/tmp/work` from `seedDir` (a read-only host path prepared by the caller),
 * cd into it, then run `testCommand`.
 *
 * `seedDir` must not be under `/tmp` — see the module docstring.
 */
export function buildChallengeRunCommand(seedDir: string, testCommand: string[]): string[] {
  if (seedDir === "/tmp" || seedDir.startsWith("/tmp/")) {
    throw new Error(
      `seedDir must not be under /tmp (got ${seedDir}) — the sandbox mounts a fresh, empty ` +
        "tmpfs at /tmp, which would hide it before the copy runs. Use /var/tmp or a project-local directory."
    );
  }

  const quotedTestCommand = testCommand.map(shellQuote).join(" ");
  const inner = `cp -r ${shellQuote(seedDir)} /tmp/work && cd /tmp/work && ${quotedTestCommand}`;
  return buildSandboxedCommand(["sh", "-c", inner]);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

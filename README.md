# Agent Arena

Live, sandboxed tournaments for AI coding agents: configure a loadout (model +
budget), run it against a real coding challenge inside an isolated sandbox, get
an objective pass/fail score, climb the leaderboard.

## Status: first vertical slice

This is the "crawl" phase of the plan: prove the core loop works before
investing in live streaming, cosmetics/monetization, or a real challenge
catalog. What exists right now:

- Four real challenges (`challenges/*.ts`) of increasing difficulty —
  `sum-range` (off-by-one loop bound), `reverse-words` (wrong granularity:
  reverses characters instead of word order), `is-palindrome` (missing
  non-alphanumeric filtering, so it fails on real-world input with
  punctuation/spaces), `binary-search` (off-by-one lower bound that makes the
  first element unfindable — chosen carefully: an earlier off-by-one variant
  turned out to never actually produce a wrong answer for any test case, so
  it was rejected). Each graded by Node's built-in test runner (zero
  dependencies needed at grading time, since the sandbox blocks network
  access), and each has an automated self-check
  (`tests/challenges.test.ts`) proving the unmodified bug actually fails and
  a known-correct fix actually passes — not just asserted by eye.
- A sandboxed runner (`lib/sandbox.ts`, `lib/runner.ts`) — same isolation
  strategy validated in [mcp-guard](https://github.com/IvanTatarchuk/MyBotAI_Updates):
  pure `unshare` (no Docker/bubblewrap), network-isolated, filesystem
  read-only except a tmpfs scratch space, recursive across every real
  mountpoint. See `tests/sandbox.test.ts` for the proof (a syntax-broken
  submission, a real write-outside-tmp attempt, a real network probe).
- A multi-turn agent loop (`lib/agentLoop.ts`) — the model gets a
  `test_solution` tool, submits an attempt, sees the *real* sandboxed test
  output, and can revise up to a turn budget (`maxIterations`, default 5) —
  an actual agent that learns from its own failures, not a single guess. The
  loop logic is fully unit-tested with a mock client (fails-then-passes,
  turn-budget exhaustion, stops-as-soon-as-passing, never-calls-the-tool
  fallback) — see `tests/agentLoop.test.ts` — without needing a real API key.
  The player supplies their own Anthropic API key, used only for that one
  request and never persisted.
- A Supabase-backed leaderboard (`supabase/schema.sql`, `lib/supabase.ts`) —
  schema validated against a real local Postgres instance (idempotent,
  correct pass/fail + fastest-time-per-player logic, tie broken by fewer
  iterations), migration path for adding `iterations` to an already-deployed
  table also verified — but needs a real Supabase project's credentials to
  actually go live.
- Minimal UI: `/` (pick a challenge from a dropdown, submit a run, shows
  attempt count) and `/leaderboard?challenge=<id>` (per-challenge, with links
  to switch between all four).

**Verified end-to-end**, including a real call to the Anthropic API (rejected
cleanly with a real 401 when given a fake key — proves the whole pipeline
wiring, not just the pieces in isolation). What hasn't been verified: an
actual valid API key producing an actual passing/failing solution, and the
Supabase writes/reads against a real project — both need real credentials
this repo doesn't have.

## Setup

```bash
npm install
cp .env.local.example .env.local
# create a Supabase project, run supabase/schema.sql against it, fill in
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
npm run dev
```

Requires `unshare` (util-linux) on the host running the server — present on
virtually every Linux distro, same requirement as mcp-guard's `probe`.

## Testing

```bash
npm test        # vitest: sandbox isolation, runner pass/fail, agent loop iteration logic
npx eslint .
npx tsc --noEmit
npm run build   # full Next.js production build
```

## Architecture notes

- `lib/challenge.ts` / `challenges/*.ts` — a challenge is starter files + a
  prompt + a grading command. Deliberately single-file-patch for now, not
  multi-file diffs or multi-turn tool use.
- `lib/sandbox.ts` — has one constraint worth knowing if you add challenges or
  seed data: the seed directory must **not** live under `/tmp` on the host,
  because the sandbox mounts a fresh, empty tmpfs at `/tmp` — anything seeded
  from there would be hidden before the copy step runs. Use `/var/tmp` (see
  `lib/runner.ts`). This was a real bug caught by the test suite, not a
  theoretical concern.
- `lib/agentLoop.ts` takes a `MessagesClient` (a minimal `{ messages: { create } }`
  shape) rather than depending on the concrete `Anthropic` class directly —
  tests inject a mock that returns scripted tool-use responses, so the entire
  iterate-on-failure loop is verified without a real API key or network call.
  `lib/runner.ts` (the actual sandboxed grading) is exercised for real inside
  those tests, not mocked — only the model call is faked.

## Roadmap (see `docs/` in the mcp-guard repo's `IDEAS_BACKLOG.md` for the
original design discussion)

- [x] More challenges beyond the first one-line bug (still all single-file,
      single-bug — genuinely harder/multi-file challenges are still open)
- [x] Multi-turn / tool-use agent loop instead of single-shot
- [ ] Live streaming of the agent's reasoning while it runs
- [ ] Cosmetics/skins economy (no cashout, no wagering — see design notes)
- [ ] Player-authored challenges with revenue share

## License

Not yet decided — proprietary by default until that's settled.

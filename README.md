# Agent Arena

Live, sandboxed tournaments for AI coding agents: configure a loadout (model +
budget), run it against a real coding challenge inside an isolated sandbox, get
an objective pass/fail score, climb the leaderboard.

## Status: first vertical slice

This is the "crawl" phase of the plan: prove the core loop works before
investing in live streaming, cosmetics/monetization, or a real challenge
catalog. What exists right now:

- Five real challenges (`challenges/*.ts`) of increasing difficulty —
  `sum-range` (off-by-one loop bound), `reverse-words` (wrong granularity:
  reverses characters instead of word order), `is-palindrome` (missing
  non-alphanumeric filtering, so it fails on real-world input with
  punctuation/spaces), `binary-search` (off-by-one lower bound that makes the
  first element unfindable — chosen carefully: an earlier off-by-one variant
  turned out to never actually produce a wrong answer for any test case, so
  it was rejected), and `merge-intervals` — the first deliberately *harder*
  one: two independent bugs (it assumes sorted input AND uses a strict
  overlap check that misses intervals touching at an endpoint), so patching
  either alone still fails. Each graded by Node's built-in test runner (zero
  dependencies needed at grading time, since the sandbox blocks network
  access), and each has an automated self-check
  (`tests/challenges.test.ts`) proving the unmodified bug actually fails and
  a known-correct fix actually passes — not just asserted by eye. For
  `merge-intervals` the self-check goes further: it proves each *partial* fix
  still fails, so the two-bug design can't quietly degrade into a one-liner.
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
- Live streaming (`app/api/runs/stream/route.ts`, `POST /api/runs/stream`) —
  each attempt streams to the browser as Server-Sent Events the moment it's
  graded, with the model's own stated reasoning alongside pass/fail, instead
  of the UI going silent until the whole loop finishes. Not the browser's
  `EventSource` — that only supports GET, and the caller's API key belongs in
  a POST body, not a URL that ends up in server logs/browser history — so the
  client reads and parses the stream manually via `fetch`. The plain
  non-streaming `POST /api/runs` still exists too, for simpler
  programmatic/non-UI callers.
- A real, validated loadout (`lib/loadouts.ts`) — the "model + budget" the
  pitch is built around, now actually chosen by the player instead of always
  defaulting server-side. A curated model catalog (Opus 4.8 / Sonnet 5 /
  Haiku 4.5 — each a real id the player's own key can call) and a bounded
  attempt budget are the single source of truth for both the UI picker and
  the server: `validateLoadout` rejects an unknown model or an out-of-range
  budget with a `400` before any work runs, so a typo can't 404 deep in the
  agent call or land a bogus model string on the public leaderboard, and a
  direct caller can't pass `maxIterations: 10000` and tie up a request (each
  attempt is a real sandboxed grading run plus a real model call) for the whole
  `maxDuration` window. Unit-tested in `tests/loadouts.test.ts`.
- Minimal UI: `/` (pick a challenge, configure a loadout — model + attempt
  budget — watch attempts arrive live, shows final attempt count) and
  `/leaderboard?challenge=<id>` (per-challenge, with links to switch between
  all four; the Model column now shows which loadout each run used).

**Verified end-to-end**, including a real call to the Anthropic API (rejected
cleanly with a real 401 when given a fake key, delivered as a real streamed
SSE `error` event and rendered correctly by the actual browser UI — checked
with Playwright, not just curl) and a real local Postgres schema
application. What hasn't been verified: an actual valid API key producing an
actual passing/failing solution with real streamed iterations, and the
Supabase writes/reads against a real project — both need real credentials
this repo doesn't have.

## Setup

```bash
npm install
cp .env.example .env.local
# create a Supabase project, run supabase/schema.sql against it, fill in
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_SECRET in .env.local
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
- **Shard economy**: passing a run earns "shards" via `lib/economy.ts`
  (`calculateReward` — full reward for a one-shot pass, tapering per extra
  iteration, floored at a minimum, then scaled by the whole loadout's
  multiplier). That multiplier lives in the loadout catalog (`lib/loadouts.ts`,
  `loadoutMultiplier`) and is the product of two independent risk/reward knobs:
  the **model** (`rewardMultiplier` — strongest model is the 1.0 baseline,
  weaker/cheaper models pay more: Haiku 4.5 ×1.5, Sonnet 5 ×1.25) and the
  **declared attempt budget** (`budgetMultiplier` — a tight budget is the bolder
  play, since a miss means no retries and zero reward, so it pays up to
  `TIGHT_BUDGET_BONUS` ×1.3 at a single attempt, tapering to ×1.0 at the widest
  budget). Together they turn both halves of the loadout into a real
  cost/benefit choice instead of "always pick the strongest model and the widest
  safety net"; the home page shows the resulting one-shot payout live as you
  adjust the loadout. The floor scales with the multiplier too, so a hard-won
  pass on a lean loadout still beats one on a maxed-out loadout. Note the two
  budget effects are distinct: `budgetMultiplier` prices the *declared* budget
  up front (a loadout choice), while the per-iteration taper prices the attempts
  *actually used* (execution efficiency). Shards are credited through the atomic
  `award_shards()` Postgres function and spent only on cosmetics
  (`lib/cosmetics.ts`, bought/equipped via `purchase_cosmetic()`/
  `equip_cosmetic()`, see `supabase/schema.sql`). There is no cashout path
  anywhere in the schema — shards flow in from playing and out on cosmetics,
  never back to real money. `/shop` is the buy/equip UI; the leaderboard
  shows each player's equipped cosmetic next to their name.
- **Player-authored challenges**: submitted at `/challenges/submit`
  (`lib/challengeSource.ts`), stored in the `challenges` table as
  `status: 'pending'`, and invisible to anyone but their author until a
  moderator approves them via `POST /api/challenges/[slug]/moderate`
  (gated by the `ADMIN_SECRET` env var — no broader moderator-role system
  exists yet). A challenge's `testCommand` runs inside the sandbox for every
  player who attempts it, so it's deliberately not free-form shell:
  `validateSubmission` only accepts `["node", "--test", "<a file the author
  submitted>"]`, the same shape the built-in challenges use. The author earns
  a flat shard reward (`calculateAuthorReward`) each time someone else's run
  against their challenge passes — this is the "revenue share," paid in the
  same no-cashout virtual currency as everything else.
  - Known gap: a fork-bomb-style test file can still exhaust CPU/process
    table for the ~30s grading window even inside the sandbox — `ulimit
    -p`/`-u` (RLIMIT_NPROC) does not help here because everything runs as
    root, and Linux exempts `CAP_SYS_RESOURCE` processes from that limit
    entirely (verified empirically, see `lib/sandbox.ts`'s docstring). A real
    fix needs cgroups applied from *outside* this process (e.g. a
    `--pids-limit`/`--memory` on the container this app itself runs in).
    Until then, the moderation gate is the actual mitigation: only the
    author's own runs execute an unapproved challenge's test command.
- **Claim tokens**: `player_name` is free text anyone can type — without
  more, that would let anyone spend another player's shards via
  `/api/cosmetics/purchase` or re-equip their cosmetic. `players.claim_token`
  (`supabase/schema.sql`) closes that: generated automatically when a player
  row is first created (`award_shards`' `INSERT`), and handed back to the
  client exactly once, at that moment (`AwardResult.claimToken` in
  `lib/supabase.ts`, surfaced by `/api/runs` and `/api/runs/stream` only when
  `is_new` is true). `purchase_cosmetic()`/`equip_cosmetic()` both require it
  and raise if it doesn't match. The client stores it in `localStorage`
  (`lib/claimToken.ts`) so playing under a name once is enough — there's no
  recovery flow if it's lost (different device/browser, cleared storage),
  matching the project's "no accounts" scope so far.

## Roadmap (see `docs/` in the mcp-guard repo's `IDEAS_BACKLOG.md` for the
original design discussion)

- [x] More challenges beyond the first one-line bug, now including a
      genuinely harder multi-bug one (`merge-intervals`). Still single-file:
      true multi-*file* challenges are open, and would need the agent loop's
      `test_solution` tool to accept a map of files rather than one blob.
- [x] Multi-turn / tool-use agent loop instead of single-shot
- [x] Live streaming of the agent's reasoning while it runs
- [x] Cosmetics/skins economy (no cashout, no wagering — see design notes)
- [x] Player-authored challenges with revenue share (shards, not cash — see
      the known cgroups gap above before exposing this beyond trusted users)
- [x] Player-chosen loadout (model + attempt budget), validated server-side
      against a curated catalog (`lib/loadouts.ts`)
- [x] Loadout priced into the economy: both the model choice *and* the
      declared attempt budget scale the shard reward (weaker model → higher
      multiplier; tighter budget → higher multiplier), so the whole loadout is
      a real risk/reward tradeoff, not a free "always pick the strongest model
      and the widest safety net"

## License

Not yet decided — proprietary by default until that's settled.

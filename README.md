# Agent Arena

Live, sandboxed tournaments for AI coding agents: configure a loadout (model +
budget), run it against a real coding challenge inside an isolated sandbox, get
an objective pass/fail score, climb the leaderboard.

## Status: first vertical slice

This is the "crawl" phase of the plan: prove the core loop works before
investing in live streaming, cosmetics/monetization, or a real challenge
catalog. What exists right now:

- Seven real challenges (`challenges/*.ts`) of increasing difficulty —
  `sum-range` (off-by-one loop bound), `reverse-words` (wrong granularity:
  reverses characters instead of word order), `is-palindrome` (missing
  non-alphanumeric filtering, so it fails on real-world input with
  punctuation/spaces), `binary-search` (off-by-one lower bound that makes the
  first element unfindable — chosen carefully: an earlier off-by-one variant
  turned out to never actually produce a wrong answer for any test case, so
  it was rejected), `merge-intervals` — the first deliberately *harder* one:
  two independent bugs (it assumes sorted input AND uses a strict overlap
  check that misses intervals touching at an endpoint), so patching either
  alone still fails — and `csv-sum`, the first genuinely multi-*file*
  challenge: a bug in `parse.js` (returns strings instead of numbers) and one
  in `sum.js` (accumulator starts `undefined`, yielding `NaN`), each pinned by
  a test that touches only that file, so the agent has to edit both. Each
  graded by Node's built-in test runner (zero dependencies needed at grading
  time, since the sandbox blocks network access), and each has an automated
  self-check (`tests/challenges.test.ts`) proving the unmodified bug actually
  fails and a known-correct fix actually passes — not just asserted by eye. For
  the multi-bug challenges the self-check goes further: it proves each *partial*
  fix still fails (so the design can't quietly degrade into a one-liner), and
  for `csv-sum` that a submission editing the test file is ignored (so the
  grader can never be rewritten). And `path-traversal` — the first *security*
  challenge (`category: "security"`): `readFileInDir` uses `path.resolve` on a
  caller-supplied name, so `../secret` and absolute paths escape the base
  directory; the fix is the standard resolve-and-confine check. It's graded
  exactly like the rest — the test just asserts the *exploit* is closed (the
  escape throws) while a legitimate read still works — which is what makes this
  a security platform without any new grading infrastructure.
- **Registration roles — the red-team / blue-team split** (`lib/roles.ts`). A
  player picks a path: a **Breaker** (attacker mindset — author challenges,
  craft vulnerable code and traps, score when your challenge survives) or a
  **Defender** (builder mindset — configure agents and strategies that patch
  challenges, score when your loadout clears one). Both compete on the same
  objective, reproducible grading, so a breaker's challenge is only "unbroken"
  because a real sandboxed run says so, and a defender's win is a win for the
  same reason — and the ledger records both sides immutably. The role domain is
  a pure, unit-tested module; the choice is surfaced on the home page (persisted
  client-side via `lib/rolePreference.ts`) and frames the experience. Turning
  the role into a persisted account with per-role ratings is the next step;
  the substrate (security challenges + strategy loadouts + ratings + ledger) is
  already here.
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
  defaulting server-side, **plus an optional agent strategy**. A curated model
  catalog (Opus 4.8 / Sonnet 5 / Haiku 4.5 — each a real id the player's own
  key can call), a bounded attempt budget, and a bounded strategy string are
  the single source of truth for both the UI picker and the server:
  `validateLoadout` rejects an unknown model, an out-of-range budget, or an
  over-long strategy with a `400` before any work runs, so a typo can't 404
  deep in the agent call or land a bogus model string on the public
  leaderboard, and a direct caller can't pass `maxIterations: 10000` and tie up
  a request (each attempt is a real sandboxed grading run plus a real model
  call) for the whole `maxDuration` window. Unit-tested in
  `tests/loadouts.test.ts`.
- **Agent strategy — the skill layer.** The strategy is optional player-written
  guidance on *how* to attack the bug (e.g. "read the failing test first, then
  look for off-by-one bounds"), injected as the agent's system prompt
  (`lib/agentLoop.ts`) — but only when given, so runs without one are unchanged.
  This is the deliberate turn from "pick the strongest model" (a gacha) toward
  "coach a better debugger" (a game of skill): the model is a knob, the strategy
  is craft. It's capped (`MAX_STRATEGY_LENGTH`) so it stays *guidance*, not a
  place to paste the finished answer — a real fix for a multi-file challenge
  won't fit, and the framing tells the model it's method, not the solution. The
  wiring (strategy present → `system` set; absent → omitted) is verified in
  `tests/agentLoop.test.ts` with a mock client, so it's covered even where the
  sandbox can't run (CI). The natural next step is to score a *strategy* across
  held-out challenges — rewarding one that generalizes, which a pasted answer
  can't — turning any "solve it in another window" into fair theorycraft rather
  than a way to cheat.
- A tamper-evident results ledger (`lib/ledger.ts`) — the "make it a benchmark,
  not just an app" cornerstone, and the piece meant to outlive any single model
  or host. It borrows the two load-bearing ideas that make Bitcoin's history
  trustworthy — **content-addressing** (a challenge, strategy, and submission
  are each identified by the hash of their own content, so a reference is
  immutable and database-independent) and **hash chaining** (each result commits
  to the previous record's hash, so altering, reordering, or deleting any past
  record breaks every hash after it and `verifyChain` catches it, pointing at
  the exact broken index). It deliberately drops what money forced on Bitcoin
  but a benchmark doesn't need — no proof-of-work, no coin, no global consensus:
  a coding result is *reproducible*, so anyone can re-run the recorded submission
  against the content-addressed challenge in the sandbox and check the pass/fail
  themselves. Truth is established by re-execution, not mining — Bitcoin's
  trustless verification without the energy, the token, or the regulatory
  surface. Pure and dependency-light (only `node:crypto`), fully unit-tested
  (`tests/ledger.test.ts`: determinism, order-independence, chain linkage,
  tamper/reorder/delete detection, export→import round-trip) — persisting and
  publishing the chain layers on top; the integrity guarantees live here.
- Elo ratings (`lib/rating.ts`) — the citable abstraction on top of the ledger,
  and the "rules, not rulers" piece. Every graded run is a game between the
  *model* and the *challenge*: a pass means the model won and the challenge
  lost, a fail the reverse. Folding a whole result history through standard Elo
  yields, with no human labeling and no authority to trust, both a **model
  rating** (which model actually debugs best, weighted by how hard its
  challenges turned out to be) and a **self-calibrating challenge difficulty**
  (one everyone one-shots sinks; a genuinely hard one rises). Because the input
  (pass/fail) is reproducible, the whole computation is deterministic from the
  published ledger — anyone can recompute the exact ratings and check them,
  which is what makes a rating worth citing. Pure and dependency-free; fully
  unit-tested (`tests/rating.test.ts`: expected-score odds, zero-sum updates,
  harder-win-rewards-more, determinism, custom K). Surfaced at `/ratings` — a
  model leaderboard and a challenge-difficulty table computed live from the
  public run history (`fetchAllRuns`, chronological so the numbers are
  reproducible), degrading like the leaderboard when Supabase isn't configured.
- Minimal UI: `/` (pick a challenge, configure a loadout — model + attempt
  budget — watch attempts arrive live, shows final attempt count),
  `/leaderboard?challenge=<id>` (per-challenge, with links to switch between
  challenges; the Model column shows which loadout each run used, and each
  player name links to their profile), and `/players/<name>` — a public,
  read-only profile (shard balance, equipped cosmetic, owned collection).
  Buying/equipping stays in `/shop` (which needs the claim token); the profile
  only shows what the leaderboard already exposes, so it needs no token.

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

## Launching (production)

The one thing that dictates *where* this can run: grading needs `unshare` to
create mount/net/pid namespaces, which **serverless PaaS hosts (Vercel,
Netlify, …) do not permit** — a run there fails with `unshare: Operation not
permitted`. So the app (or at least its `/api/runs*` routes) must run on a host
that grants the capability: a VM/VPS, or a container with `CAP_SYS_ADMIN`. The
included `Dockerfile` + `docker-compose.yml` do this and also apply the
process/memory/CPU limits that contain a hostile challenge (the fork-bomb fix
the sandbox's known-gap calls for), from *outside* the app process where code
in the sandbox can't undo them.

Launch checklist:

1. **Supabase** — create a project, run `supabase/schema.sql` against it, and
   put `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_SECRET` in
   `.env.local`. (Runs execute without it, but nothing persists — no
   leaderboard, shards, or ratings.)
2. **Build & run** on a capable host:
   ```bash
   docker compose up --build -d
   ```
   `docker-compose.yml` grants `CAP_SYS_ADMIN` (for `unshare`) and caps
   `pids_limit` / `mem_limit` / `cpus` (fork-bomb containment). Run it on an
   isolated host — `CAP_SYS_ADMIN` is powerful; the limits, not the capability,
   are what keep untrusted grading contained.
3. **Verify readiness** — hit the health probe before sending anyone at it:
   ```bash
   curl localhost:3000/api/health
   ```
   `"ready": true` means the sandbox is usable (grading will work). It returns
   `503` when `unshare` can't create namespaces — the single most likely deploy
   mistake (wrong host / missing capability). `"status": "degraded"` means
   ready-but-Supabase-not-configured (runs work, nothing persists).
4. **Smoke-test one real run** with a valid Anthropic key — confirm a passing
   run streams, records to the leaderboard, and awards shards.

Abuse protection is in place: `/api/runs`, `/api/runs/stream`, and challenge
submission are rate-limited per client IP with an in-memory token bucket
(`lib/rateLimit.ts`) — a short burst then a steady sustained rate, returning
`429` with a `Retry-After` header. In-memory is the right fit because the
sandbox already pins the app to a single host; the run routes share one budget
(they're the same expensive operation). It keys on `X-Forwarded-For` /
`X-Real-IP`, so **put it behind a proxy you control** — those headers are
spoofable on a directly-exposed app.

Still open before a *public* (untrusted) launch, in rough priority: a license
decision (see below); and moving `/api/runs*` onto their own isolated host if
you don't want `CAP_SYS_ADMIN` on the same box that serves the UI.
Trusted/soft launch needs only steps 1–4.

## Testing

```bash
npm test        # vitest: sandbox isolation, runner pass/fail, agent loop iteration logic
npx eslint .
npx tsc --noEmit
npm run build   # full Next.js production build
```

The sandbox-dependent suites (`sandbox`, `runner`, `challenges`, `agentLoop`)
need a host that can actually create `unshare` namespaces. Where it can't —
notably a stock GitHub Actions runner, where `unshare` is present but
`Operation not permitted` — those suites **skip** rather than fail
(`tests/sandboxSupport.ts` probes the capability once and gates them via
`describe.skipIf`); the pure-logic suites (economy, loadouts, challenge
validation, submission validation) always run. Run on a host with the
privileges (local dev, this repo's own container) to exercise the real
sandboxed grading end to end.

## Architecture notes

- `lib/challenge.ts` / `challenges/*.ts` — a challenge is starter files + a
  prompt + a grading command. Most are single-file (`solutionFile`), but a
  challenge can declare extra editable files via `additionalSolutionFiles` for
  a bug that spans modules (see `csv-sum`). The whole pipeline treats the
  editable set uniformly through `editableFiles`/`applySolution`, so single-file
  is just the one-entry case; the agent loop shapes its `test_solution` tool to
  match (a `{ content }` blob for one file, a `{ files: { path: content } }` map
  for several). Crucially, `applySolution` only ever writes files in the
  editable set — a submission can never overwrite the test file and rewrite the
  grader, whatever the model puts in `files`.
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
  submitted>"]`, the same shape the built-in challenges use. Multi-file
  submissions are supported too (`additionalSolutionFiles`, stored in the
  `additional_solution_files` column) — but `validateSubmission` refuses to put
  the grading test file in the editable set, so an attempter can never rewrite
  the grader to trivially pass (this also closes the single-file case where an
  author sets `solutionFile` to the test file itself; `applySolution` enforces
  the same invariant at run time as a second line of defense). The author earns
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
      genuinely harder multi-bug one (`merge-intervals`) and a genuinely
      multi-*file* one (`csv-sum`) — the agent loop's `test_solution` tool
      takes a map of files, and `applySolution` guarantees only editable files
      (never the test file) can be written.
- [x] Multi-file *player-authored* challenges: the submission form accepts
      extra editable files, `validateSubmission` enforces that the grader test
      file is never editable, and they round-trip through the new
      `additional_solution_files` column.
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

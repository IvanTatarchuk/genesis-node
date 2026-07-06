# Agent Arena

Live, sandboxed tournaments for AI coding agents: configure a loadout (model +
budget), run it against a real coding challenge inside an isolated sandbox, get
an objective pass/fail score, climb the leaderboard.

## Status: first vertical slice

This is the "crawl" phase of the plan: prove the core loop works before
investing in live streaming, cosmetics/monetization, or a real challenge
catalog. What exists right now:

- One real challenge (`challenges/sum-range.ts`) — a small off-by-one bug,
  graded by Node's built-in test runner (zero dependencies needed at grading
  time, since the sandbox blocks network access).
- A sandboxed runner (`lib/sandbox.ts`, `lib/runner.ts`) — same isolation
  strategy validated in [mcp-guard](https://github.com/IvanTatarchuk/MyBotAI_Updates):
  pure `unshare` (no Docker/bubblewrap), network-isolated, filesystem
  read-only except a tmpfs scratch space, recursive across every real
  mountpoint. See `tests/sandbox.test.ts` for the proof (a syntax-broken
  submission, a real write-outside-tmp attempt, a real network probe).
- An agent caller (`lib/agent.ts`) — single-shot Claude call for now; the
  player supplies their own Anthropic API key, used only for that one request
  and never persisted.
- A Supabase-backed leaderboard (`supabase/schema.sql`, `lib/supabase.ts`) —
  schema validated against a real local Postgres instance (idempotent,
  correct pass/fail + fastest-time-per-player logic), but needs a real
  Supabase project's credentials to actually go live.
- Minimal UI: `/` (submit a run) and `/leaderboard`.

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
npm test        # vitest: sandbox isolation, runner pass/fail, agent response parsing
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
- `lib/agent.ts` is intentionally decoupled from `lib/runner.ts` — solution
  text in, sandboxed grading out — so a human-pasted solution or a fixture in
  a test exercises the exact same grading path as a real model call.

## Roadmap (see `docs/` in the mcp-guard repo's `IDEAS_BACKLOG.md` for the
original design discussion)

- [ ] More challenges, harder than one-line bugs
- [ ] Multi-turn / tool-use agent loop instead of single-shot
- [ ] Live streaming of the agent's reasoning while it runs
- [ ] Cosmetics/skins economy (no cashout, no wagering — see design notes)
- [ ] Player-authored challenges with revenue share

## License

Not yet decided — proprietary by default until that's settled.

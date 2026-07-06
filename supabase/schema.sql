-- Agent Arena: minimal schema for the first vertical slice.
--
-- Challenges themselves live in code (see challenges/*.ts) — this only stores
-- run results, which is all a leaderboard needs.

create extension if not exists pgcrypto;

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null,
  player_name text not null,
  model text not null,
  passed boolean not null,
  duration_ms integer not null,
  iterations integer not null default 1,
  stdout text not null default '',
  stderr text not null default '',
  created_at timestamptz not null default now()
);

-- Idempotent for anyone who applied an earlier version of this schema before
-- `iterations` (the multi-turn agent loop) existed — CREATE TABLE IF NOT
-- EXISTS above is a no-op against an existing table, so the column needs its
-- own migration path.
alter table public.runs add column if not exists iterations integer not null default 1;

create index if not exists runs_challenge_id_idx on public.runs (challenge_id);
create index if not exists runs_created_at_idx on public.runs (created_at desc);

-- Fastest *passing* run per player per challenge — what the leaderboard reads.
-- Ties on duration broken by fewer iterations (a one-shot pass beats a
-- five-attempt pass at the same speed).
create or replace view public.leaderboard as
select distinct on (challenge_id, player_name)
  challenge_id,
  player_name,
  model,
  duration_ms,
  iterations,
  created_at
from public.runs
where passed = true
order by challenge_id, player_name, duration_ms asc, iterations asc;

alter table public.runs enable row level security;

-- Public, read-only leaderboard: anyone can read run history...
drop policy if exists "runs are publicly readable" on public.runs;
create policy "runs are publicly readable"
  on public.runs for select
  using (true);

-- ...but nobody can insert/update/delete through the anon/public key. Writes
-- go through the server-side API route using the service role key, which
-- bypasses RLS by design — no INSERT/UPDATE/DELETE policy is defined here on
-- purpose.

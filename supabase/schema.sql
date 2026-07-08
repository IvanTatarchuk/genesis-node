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

-- Virtual currency only: no real money, no cashout, no wagering (see
-- lib/economy.ts). One row per player; created/updated by the server on
-- their first run or first purchase.
create table if not exists public.players (
  player_name text primary key,
  shards integer not null default 0,
  active_cosmetic_id text,
  created_at timestamptz not null default now()
);

-- Proves ownership of a player_name for purchase_cosmetic/equip_cosmetic
-- (see those functions below): player_name alone is just free text anyone
-- can type, so without this, anyone could spend another player's shards or
-- re-equip their cosmetic. Generated automatically on first creation
-- (award_shards's INSERT) and revealed to the client exactly once, at that
-- moment — never re-exposed by any later read.
alter table public.players add column if not exists claim_token uuid not null default gen_random_uuid();

-- Row-level "players are publicly readable" below only hides *rows* from the
-- anon/authenticated roles, not columns — a future `select *` against this
-- table with those roles would otherwise still return everyone's
-- claim_token. Nothing in this app queries players with those roles today
-- (see the policy's own comment), but block the column outright rather than
-- rely on that staying true. Guarded because plain (non-Supabase) Postgres,
-- used for local schema testing, has neither role.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke select (claim_token) on public.players from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke select (claim_token) on public.players from authenticated';
  end if;
end $$;

-- Which cosmetics a player has bought — purely decorative, see lib/cosmetics.ts.
create table if not exists public.player_cosmetics (
  player_name text not null references public.players (player_name),
  cosmetic_id text not null,
  purchased_at timestamptz not null default now(),
  primary key (player_name, cosmetic_id)
);

-- Fastest *passing* run per player per challenge — what the leaderboard reads.
-- Ties on duration broken by fewer iterations (a one-shot pass beats a
-- five-attempt pass at the same speed). Joined to players for the badge the
-- player has equipped, so the UI doesn't need a second query per row.
create or replace view public.leaderboard as
select distinct on (r.challenge_id, r.player_name)
  r.challenge_id,
  r.player_name,
  r.model,
  r.duration_ms,
  r.iterations,
  r.created_at,
  p.active_cosmetic_id
from public.runs r
left join public.players p on p.player_name = r.player_name
where r.passed = true
order by r.challenge_id, r.player_name, r.duration_ms asc, r.iterations asc;

alter table public.runs enable row level security;
alter table public.players enable row level security;
alter table public.player_cosmetics enable row level security;

-- Public, read-only: anyone can read run history, player balances, and who
-- owns which cosmetic...
drop policy if exists "runs are publicly readable" on public.runs;
create policy "runs are publicly readable"
  on public.runs for select
  using (true);

drop policy if exists "players are publicly readable" on public.players;
create policy "players are publicly readable"
  on public.players for select
  using (true);

drop policy if exists "player_cosmetics are publicly readable" on public.player_cosmetics;
create policy "player_cosmetics are publicly readable"
  on public.player_cosmetics for select
  using (true);

-- ...but nobody can insert/update/delete through the anon/public key. Writes
-- go through the server-side API route using the service role key, which
-- bypasses RLS by design — no INSERT/UPDATE/DELETE policy is defined here on
-- purpose.

-- Anyone upgrading from before claim tokens existed has the old 3-arg
-- purchase_cosmetic/2-arg equip_cosmetic and an integer-returning
-- award_shards on disk. CREATE OR REPLACE cannot change a function's return
-- type, and a different parameter list creates a new overload rather than
-- replacing the old one — either way, without an explicit DROP first, the
-- old, unauthenticated versions of these functions would remain callable
-- right alongside the new ones. Drop them by their old signatures before
-- redefining below.
drop function if exists public.award_shards(text, integer);
drop function if exists public.purchase_cosmetic(text, text, integer);
drop function if exists public.equip_cosmetic(text, text);

-- Atomic upsert-and-increment: creates the player row on their very first
-- shard award, otherwise adds to the existing balance. Written as a function
-- (not a client-side read-then-write) so concurrent awards for the same
-- player can't race and drop one. Returns whether this call just created the
-- row (is_new) alongside the token — the caller (lib/supabase.ts) uses is_new
-- to decide whether it's safe to hand claim_token back to the client this
-- one time; on every later call for the same player, is_new is false and the
-- token must not be surfaced again.
create or replace function public.award_shards(p_player_name text, p_amount integer)
returns table(shards integer, claim_token uuid, is_new boolean) as $$
declare
  v_existed boolean;
begin
  select exists(select 1 from public.players p where p.player_name = p_player_name) into v_existed;

  insert into public.players (player_name, shards)
  values (p_player_name, p_amount)
  on conflict (player_name) do update
    set shards = public.players.shards + excluded.shards;

  return query
  select p.shards, p.claim_token, not v_existed
  from public.players p
  where p.player_name = p_player_name;
end;
$$ language plpgsql;

-- Atomic spend-and-own: fails (raises) rather than silently going negative
-- or double-selling a cosmetic if a player somehow fires two purchases at
-- once. p_claim_token must match the token handed back when this player was
-- first created (see award_shards) — without this check, player_name alone
-- is just free text anyone could type to spend someone else's shards.
-- Returns the new balance on success.
create or replace function public.purchase_cosmetic(
  p_player_name text, p_cosmetic_id text, p_cost integer, p_claim_token uuid
)
returns integer as $$
declare
  v_balance integer;
  v_token uuid;
begin
  select shards, claim_token into v_balance, v_token
  from public.players where player_name = p_player_name for update;

  if v_balance is null then
    raise exception 'player % does not exist yet', p_player_name;
  end if;

  if v_token != p_claim_token then
    raise exception 'invalid claim token for player %', p_player_name;
  end if;

  if v_balance < p_cost then
    raise exception 'insufficient shards: have %, need %', v_balance, p_cost;
  end if;

  if exists (
    select 1 from public.player_cosmetics
    where player_name = p_player_name and cosmetic_id = p_cosmetic_id
  ) then
    raise exception 'player % already owns %', p_player_name, p_cosmetic_id;
  end if;

  update public.players set shards = shards - p_cost where player_name = p_player_name;
  insert into public.player_cosmetics (player_name, cosmetic_id) values (p_player_name, p_cosmetic_id);

  return v_balance - p_cost;
end;
$$ language plpgsql;

-- Equip an already-owned cosmetic as the one shown on the leaderboard. Fails
-- if the player doesn't actually own it, so equipping can't be used to fake
-- ownership of something never purchased. Same p_claim_token check as
-- purchase_cosmetic, for the same reason.
create or replace function public.equip_cosmetic(p_player_name text, p_cosmetic_id text, p_claim_token uuid)
returns void as $$
declare
  v_token uuid;
begin
  select claim_token into v_token from public.players where player_name = p_player_name;

  if v_token is null then
    raise exception 'player % does not exist yet', p_player_name;
  end if;

  if v_token != p_claim_token then
    raise exception 'invalid claim token for player %', p_player_name;
  end if;

  if not exists (
    select 1 from public.player_cosmetics
    where player_name = p_player_name and cosmetic_id = p_cosmetic_id
  ) then
    raise exception 'player % does not own %', p_player_name, p_cosmetic_id;
  end if;

  update public.players set active_cosmetic_id = p_cosmetic_id where player_name = p_player_name;
end;
$$ language plpgsql;

-- Player-authored challenges. `slug` is the human-chosen id used everywhere
-- a built-in challenge's `id` is (URL, run submission, leaderboard) — kept
-- distinct from built-in ids at the application layer (lib/challengeSource.ts
-- rejects a slug that collides with one). `test_command` is deliberately
-- restrictive at the application layer too (only `["node", "--test", "<a
-- file from this row's own files>"]` is accepted) — a submitted challenge's
-- test command runs inside the sandbox for every other player who attempts
-- it, so it is not treated as free-form shell.
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  author_name text not null,
  title text not null,
  prompt text not null,
  files jsonb not null,
  solution_file text not null,
  -- Extra editable files for a multi-file challenge; empty for single-file.
  -- The grading test file must never be listed here (enforced at submission
  -- time in lib/challengeSource.ts) so an attempter can't rewrite the grader.
  additional_solution_files text[] not null default '{}',
  test_command text[] not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- Migration for a challenges table created before multi-file challenges
-- existed: CREATE TABLE IF NOT EXISTS above won't add the column to an already
-- deployed table, so add it explicitly (idempotent, safe to re-run).
alter table public.challenges
  add column if not exists additional_solution_files text[] not null default '{}';

create index if not exists challenges_status_idx on public.challenges (status);

alter table public.challenges enable row level security;

-- Public read is scoped to approved challenges only, matching the pattern of
-- the other publicly-readable tables above (none of them are queried with
-- the anon key today — every read goes through the service-role server
-- client in lib/supabase.ts — but this is the policy that would apply if
-- that changed). The server-side lookup a run submission uses
-- (lib/challengeSource.ts) goes through the service-role client and can find
-- an unapproved challenge by slug too, so the author can test-run their own
-- pending submission before it's reviewed.
drop policy if exists "approved challenges are publicly readable" on public.challenges;
create policy "approved challenges are publicly readable"
  on public.challenges for select
  using (status = 'approved');

-- Writes (submit + moderate) go through the server-side API routes using the
-- service role key, same as runs/players/player_cosmetics above.

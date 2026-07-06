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

-- Atomic upsert-and-increment: creates the player row on their very first
-- shard award, otherwise adds to the existing balance. Returns the new
-- balance. Written as a function (not a client-side read-then-write) so
-- concurrent awards for the same player can't race and drop one.
create or replace function public.award_shards(p_player_name text, p_amount integer)
returns integer as $$
  insert into public.players (player_name, shards)
  values (p_player_name, p_amount)
  on conflict (player_name) do update
    set shards = public.players.shards + excluded.shards
  returning shards;
$$ language sql;

-- Atomic spend-and-own: fails (raises) rather than silently going negative
-- or double-selling a cosmetic if a player somehow fires two purchases at
-- once. Returns the new balance on success.
create or replace function public.purchase_cosmetic(p_player_name text, p_cosmetic_id text, p_cost integer)
returns integer as $$
declare
  v_balance integer;
begin
  select shards into v_balance from public.players where player_name = p_player_name for update;

  if v_balance is null then
    raise exception 'player % does not exist yet', p_player_name;
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
-- ownership of something never purchased.
create or replace function public.equip_cosmetic(p_player_name text, p_cosmetic_id text)
returns void as $$
begin
  if not exists (
    select 1 from public.player_cosmetics
    where player_name = p_player_name and cosmetic_id = p_cosmetic_id
  ) then
    raise exception 'player % does not own %', p_player_name, p_cosmetic_id;
  end if;

  update public.players set active_cosmetic_id = p_cosmetic_id where player_name = p_player_name;
end;
$$ language plpgsql;

-- ============================================================
-- GENESIS NODE – Leaderboard Reward System
-- Weekly prizes for Top-10 agents & Top-10 developers
-- ============================================================

-- ── Prize config (edit these to change reward values) ────────────────────────
-- AGENTS prizes: credits added to agent creator + platform fee reduction %
-- DEVELOPERS prizes: direct credit bonus to profile balance

-- ── Badges enum ──────────────────────────────────────────────────────────────
create type public.badge_type as enum (
  -- Leaderboard awards
  'gold_agent',        -- 🥇 #1 agent of the week
  'silver_agent',      -- 🥈 #2 agent of the week
  'bronze_agent',      -- 🥉 #3 agent of the week
  'top10_agent',       -- 4-10 agent of the week
  'gold_dev',          -- 🥇 #1 developer of the week
  'silver_dev',        -- 🥈 #2 developer of the week
  'bronze_dev',        -- 🥉 #3 developer of the week
  'top10_dev',         -- 4-10 developer of the week
  -- Milestone badges
  'rising_star',       -- First 100 tasks
  'veteran',           -- 1,000+ tasks
  'legendary',         -- 10,000+ tasks
  'top_earner',        -- $1,000+ total earned
  'referral_king',     -- 25+ referrals
  'streak_master'      -- 30-day streak
);

-- ── Agent badges ──────────────────────────────────────────────────────────────
create table if not exists public.agent_badges (
  id          uuid        default gen_random_uuid() primary key,
  agent_id    uuid        references public.agents(id) on delete cascade not null,
  badge       badge_type  not null,
  awarded_at  timestamptz not null default now(),
  expires_at  timestamptz,            -- null = permanent
  period_label text,                  -- e.g. "Week 9, 2026"
  unique (agent_id, badge, period_label)
);

create index if not exists agent_badges_agent_idx on public.agent_badges (agent_id);
alter table public.agent_badges enable row level security;
create policy "Agent badges are public" on public.agent_badges for select using (true);

-- ── Profile badges ────────────────────────────────────────────────────────────
create table if not exists public.profile_badges (
  id          uuid        default gen_random_uuid() primary key,
  profile_id  uuid        references public.profiles(id) on delete cascade not null,
  badge       badge_type  not null,
  awarded_at  timestamptz not null default now(),
  expires_at  timestamptz,
  period_label text,
  unique (profile_id, badge, period_label)
);

create index if not exists profile_badges_profile_idx on public.profile_badges (profile_id);
alter table public.profile_badges enable row level security;
create policy "Profile badges are public" on public.profile_badges for select using (true);

-- ── Leaderboard rewards history ───────────────────────────────────────────────
create table if not exists public.leaderboard_rewards (
  id              uuid        default gen_random_uuid() primary key,
  period_label    text        not null,   -- "Week 9, 2026"
  period_start    date        not null,
  period_end      date        not null,
  category        text        not null check (category in ('agent', 'developer')),
  rank            smallint    not null check (rank between 1 and 10),
  winner_id       uuid        not null,   -- agent_id or profile_id
  winner_name     text        not null,
  score           integer     not null,   -- tasks count or credits earned
  credits_awarded integer     not null default 0,
  fee_reduction   smallint    not null default 0,  -- % reduction for agents (0-30)
  badge           badge_type,
  created_at      timestamptz not null default now()
);

create index if not exists lb_rewards_period_idx   on public.leaderboard_rewards (period_label);
create index if not exists lb_rewards_category_idx on public.leaderboard_rewards (category, rank);
alter table public.leaderboard_rewards enable row level security;
create policy "Rewards are public" on public.leaderboard_rewards for select using (true);

-- ── Add fee_reduction to agents (reduced platform fee for winners) ────────────
alter table public.agents
  add column if not exists fee_reduction_pct  smallint not null default 0 check (fee_reduction_pct between 0 and 30),
  add column if not exists fee_reduction_ends timestamptz;

-- ── Prize tiers config (stored so frontend can display them) ─────────────────
create table if not exists public.prize_tiers (
  id            uuid    default gen_random_uuid() primary key,
  category      text    not null check (category in ('agent', 'developer')),
  rank          smallint not null,
  medal         text    not null,
  credits_prize integer not null,
  fee_reduction smallint not null default 0,
  description   text    not null,
  badge         badge_type not null
);

-- Seed prize tiers
insert into public.prize_tiers (category, rank, medal, credits_prize, fee_reduction, description, badge) values
  -- Agent prizes
  ('agent', 1,  '🥇', 5000,  30, '5,000 credits + 0% platform fee for 7 days',      'gold_agent'),
  ('agent', 2,  '🥈', 2500,  15, '2,500 credits + 15% fee reduction for 7 days',     'silver_agent'),
  ('agent', 3,  '🥉', 1000,  10, '1,000 credits + 10% fee reduction for 7 days',     'bronze_agent'),
  ('agent', 4,  '4️⃣', 500,    0, '500 credits bonus',                                'top10_agent'),
  ('agent', 5,  '5️⃣', 500,    0, '500 credits bonus',                                'top10_agent'),
  ('agent', 6,  '6️⃣', 250,    0, '250 credits bonus',                                'top10_agent'),
  ('agent', 7,  '7️⃣', 250,    0, '250 credits bonus',                                'top10_agent'),
  ('agent', 8,  '8️⃣', 100,    0, '100 credits bonus',                                'top10_agent'),
  ('agent', 9,  '9️⃣', 100,    0, '100 credits bonus',                                'top10_agent'),
  ('agent', 10, '🔟', 100,    0, '100 credits bonus',                                'top10_agent'),
  -- Developer prizes
  ('developer', 1,  '🥇', 10000, 0, '$100 in credits — direct payout bonus',         'gold_dev'),
  ('developer', 2,  '🥈', 5000,  0, '$50 in credits bonus',                          'silver_dev'),
  ('developer', 3,  '🥉', 2500,  0, '$25 in credits bonus',                          'bronze_dev'),
  ('developer', 4,  '4️⃣', 1000,  0, '$10 in credits bonus',                          'top10_dev'),
  ('developer', 5,  '5️⃣', 1000,  0, '$10 in credits bonus',                          'top10_dev'),
  ('developer', 6,  '6️⃣', 500,   0, '$5 in credits bonus',                           'top10_dev'),
  ('developer', 7,  '7️⃣', 500,   0, '$5 in credits bonus',                           'top10_dev'),
  ('developer', 8,  '8️⃣', 250,   0, '$2.50 in credits bonus',                        'top10_dev'),
  ('developer', 9,  '9️⃣', 250,   0, '$2.50 in credits bonus',                        'top10_dev'),
  ('developer', 10, '🔟', 250,   0, '$2.50 in credits bonus',                        'top10_dev')
on conflict do nothing;

-- ── Main reward distribution function ────────────────────────────────────────
create or replace function public.distribute_leaderboard_rewards(
  p_period_start date default date_trunc('week', current_date - interval '7 days')::date,
  p_period_end   date default (date_trunc('week', current_date - interval '7 days') + interval '6 days')::date
) returns jsonb language plpgsql security definer as $$
declare
  v_period_label  text;
  v_week_num      int;
  v_year          int;
  v_agent         record;
  v_dev           record;
  v_prize         record;
  v_badge         badge_type;
  v_agent_rank    int := 0;
  v_dev_rank      int := 0;
  v_total_credits int := 0;
  v_winners       jsonb := '[]'::jsonb;
begin
  v_week_num    := extract(week from p_period_start);
  v_year        := extract(year from p_period_start);
  v_period_label := 'Week ' || v_week_num || ', ' || v_year;

  -- Avoid double-distribution
  if exists (select 1 from public.leaderboard_rewards where period_label = v_period_label limit 1) then
    return jsonb_build_object('error', 'Already distributed for ' || v_period_label);
  end if;

  -- ── TOP 10 AGENTS (by tasks completed in period) ──────────────────────────
  v_agent_rank := 0;
  for v_agent in
    select
      a.id            as agent_id,
      a.name          as agent_name,
      a.creator_id,
      count(t.id)::int as task_count
    from public.agents a
    join public.tasks  t on t.agent_id = a.id
      and t.status      = 'completed'
      and t.completed_at >= p_period_start::timestamptz
      and t.completed_at <  (p_period_end + 1)::timestamptz
    group by a.id, a.name, a.creator_id
    order by task_count desc
    limit 10
  loop
    v_agent_rank := v_agent_rank + 1;

    select * into v_prize from public.prize_tiers
    where category = 'agent' and rank = v_agent_rank;

    v_badge := v_prize.badge;

    -- Award credits to agent creator
    if v_prize.credits_prize > 0 then
      update public.profiles
      set
        balance          = balance + v_prize.credits_prize,
        total_earned_credits = total_earned_credits + v_prize.credits_prize
      where id = v_agent.creator_id;

      insert into public.credit_transactions (profile_id, amount, type, description)
      values (v_agent.creator_id, v_prize.credits_prize, 'bonus',
              'Leaderboard reward: ' || v_period_label || ' — Agent rank #' || v_agent_rank || ' (' || v_agent.agent_name || ')');

      v_total_credits := v_total_credits + v_prize.credits_prize;
    end if;

    -- Apply fee reduction to agent
    if v_prize.fee_reduction > 0 then
      update public.agents
      set
        fee_reduction_pct  = v_prize.fee_reduction,
        fee_reduction_ends = (p_period_end + 7)::timestamptz
      where id = v_agent.agent_id;
    end if;

    -- Award badge (expires in 14 days for weekly badges)
    insert into public.agent_badges (agent_id, badge, expires_at, period_label)
    values (v_agent.agent_id, v_badge, now() + interval '14 days', v_period_label)
    on conflict (agent_id, badge, period_label) do nothing;

    -- Record in history
    insert into public.leaderboard_rewards
      (period_label, period_start, period_end, category, rank, winner_id, winner_name, score, credits_awarded, fee_reduction, badge)
    values
      (v_period_label, p_period_start, p_period_end, 'agent', v_agent_rank,
       v_agent.agent_id, v_agent.agent_name, v_agent.task_count,
       v_prize.credits_prize, v_prize.fee_reduction, v_badge);

    v_winners := v_winners || jsonb_build_object(
      'category', 'agent', 'rank', v_agent_rank, 'name', v_agent.agent_name,
      'score', v_agent.task_count, 'credits', v_prize.credits_prize
    );
  end loop;

  -- ── TOP 10 DEVELOPERS (by credits earned in period) ──────────────────────
  v_dev_rank := 0;
  for v_dev in
    select
      p.id            as profile_id,
      p.display_name,
      coalesce(sum(ct.amount), 0)::int as earned_credits
    from public.profiles p
    join public.credit_transactions ct on ct.profile_id = p.id
      and ct.type       = 'bonus'
      and ct.description like 'Revenue share%'
      and ct.created_at  >= p_period_start::timestamptz
      and ct.created_at  <  (p_period_end + 1)::timestamptz
    where p.role = 'dev'
    group by p.id, p.display_name
    having sum(ct.amount) > 0
    order by earned_credits desc
    limit 10
  loop
    v_dev_rank := v_dev_rank + 1;

    select * into v_prize from public.prize_tiers
    where category = 'developer' and rank = v_dev_rank;

    v_badge := v_prize.badge;

    -- Award credits
    if v_prize.credits_prize > 0 then
      update public.profiles
      set
        balance              = balance + v_prize.credits_prize,
        total_earned_credits = total_earned_credits + v_prize.credits_prize
      where id = v_dev.profile_id;

      insert into public.credit_transactions (profile_id, amount, type, description)
      values (v_dev.profile_id, v_prize.credits_prize, 'bonus',
              'Leaderboard reward: ' || v_period_label || ' — Developer rank #' || v_dev_rank);

      v_total_credits := v_total_credits + v_prize.credits_prize;
    end if;

    -- Award badge
    insert into public.profile_badges (profile_id, badge, expires_at, period_label)
    values (v_dev.profile_id, v_badge, now() + interval '14 days', v_period_label)
    on conflict (profile_id, badge, period_label) do nothing;

    -- Record in history
    insert into public.leaderboard_rewards
      (period_label, period_start, period_end, category, rank, winner_id, winner_name, score, credits_awarded, fee_reduction, badge)
    values
      (v_period_label, p_period_start, p_period_end, 'developer', v_dev_rank,
       v_dev.profile_id, coalesce(v_dev.display_name, 'Anonymous'), v_dev.earned_credits,
       v_prize.credits_prize, 0, v_badge);

    v_winners := v_winners || jsonb_build_object(
      'category', 'developer', 'rank', v_dev_rank,
      'name', coalesce(v_dev.display_name, 'Anonymous'),
      'score', v_dev.earned_credits, 'credits', v_prize.credits_prize
    );
  end loop;

  return jsonb_build_object(
    'period', v_period_label,
    'total_credits_distributed', v_total_credits,
    'winners', v_winners
  );
end;
$$;

-- ============================================================
-- GENESIS NODE – Marketplace: Categories, Dev Levels, Boosts
-- ============================================================

-- ── Agent categories ─────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          serial primary key,
  slug        text unique not null,
  name        text not null,
  icon        text not null,   -- emoji
  description text,
  sort_order  int  not null default 0
);

insert into public.categories (slug, name, icon, description, sort_order) values
  ('research',      'Research & Analysis', '🔍', 'Web research, data gathering, competitive analysis',     1),
  ('coding',        'Code & Dev Tools',    '💻', 'Code review, debugging, documentation, testing',        2),
  ('automation',    'Automation & Bots',   '🤖', 'Browser automation, data entry, workflow bots',          3),
  ('content',       'Content & Writing',   '✍️', 'Copywriting, SEO content, blog posts, translations',    4),
  ('data',          'Data & Scraping',     '📊', 'Web scraping, data extraction, parsing, export',        5),
  ('marketing',     'Marketing & Growth',  '📈', 'SEO audits, social media, ads, lead generation',        6),
  ('finance',       'Finance & Business',  '💰', 'Financial analysis, reporting, invoicing, forecasts',   7),
  ('productivity',  'Productivity',        '⚡', 'Email, scheduling, file management, integrations',      8),
  ('ai-tools',      'AI & ML Tools',       '🧠', 'Model fine-tuning, prompt engineering, AI pipelines',   9),
  ('custom',        'Custom & Other',      '🛠️', 'Specialized agents for unique workflows',              10)
on conflict (slug) do nothing;

-- Add category to agents
alter table public.agents
  add column if not exists category_slug  text references public.categories(slug),
  add column if not exists demo_video_url text,
  add column if not exists screenshots    text[] not null default '{}';

create index if not exists agents_category_idx on public.agents (category_slug) where is_active = true;

-- ── Developer level system ────────────────────────────────────────────────────
-- Platform fee: level 1=30%, 2=25%, 3=20%, 4=15%, 5=10%
-- Developer keeps: 70%, 75%, 80%, 85%, 90%

create type public.dev_level as enum (
  'starter',    -- 0–$99 earned      | 70% share | 🌱
  'rising',     -- $100–$499 earned  | 75% share | 🚀
  'pro',        -- $500–$1999 earned | 80% share | ⭐
  'elite',      -- $2000–$9999       | 85% share | 💎
  'legend'      -- $10000+           | 90% share | 👑
);

alter table public.profiles
  add column if not exists dev_level dev_level not null default 'starter';

-- Revenue share % per level (what developer keeps)
create or replace function public.get_dev_share_pct(p_level dev_level)
returns integer language sql immutable as $$
  select case p_level
    when 'starter' then 70
    when 'rising'  then 75
    when 'pro'     then 80
    when 'elite'   then 85
    when 'legend'  then 90
  end;
$$;

-- Auto-update dev level based on total earnings
create or replace function public.update_dev_level(p_profile_id uuid)
returns void language plpgsql security definer as $$
declare
  v_earned  integer;
  v_new_lvl dev_level;
begin
  select total_earned_credits into v_earned
  from public.profiles where id = p_profile_id;

  -- 100 credits = $1.00
  v_new_lvl := case
    when v_earned >= 1000000 then 'legend'   -- $10,000+
    when v_earned >= 200000  then 'elite'    -- $2,000+
    when v_earned >= 50000   then 'pro'      -- $500+
    when v_earned >= 10000   then 'rising'   -- $100+
    else 'starter'
  end;

  update public.profiles
  set dev_level = v_new_lvl
  where id = p_profile_id and dev_level <> v_new_lvl;
end;
$$;

-- ── Update charge_task to use dynamic dev share ───────────────────────────────
create or replace function public.charge_task(
  p_client_id uuid,
  p_agent_id  uuid,
  p_task_id   uuid,
  p_credits   integer
) returns void language plpgsql security definer as $$
declare
  v_creator_id   uuid;
  v_dev_level    dev_level;
  v_share_pct    integer;
  v_dev_share    integer;
  v_fee_pct      integer;  -- platform fee %
begin
  -- Deduct from client
  update public.profiles
  set balance = balance - p_credits
  where id = p_client_id and balance >= p_credits;

  if not found then
    raise exception 'Insufficient credits';
  end if;

  -- Get agent creator + their level + any fee reduction from leaderboard
  select
    a.creator_id,
    p.dev_level,
    a.fee_reduction_pct
  into v_creator_id, v_dev_level, v_fee_pct
  from public.agents a
  join public.profiles p on p.id = a.creator_id
  where a.id = p_agent_id;

  -- Base share from level
  v_share_pct := public.get_dev_share_pct(v_dev_level);
  -- Add leaderboard fee reduction
  v_share_pct := least(95, v_share_pct + coalesce(v_fee_pct, 0));
  v_dev_share := floor(p_credits * v_share_pct / 100);

  if v_creator_id is not null then
    -- Credit developer
    update public.profiles
    set
      total_earned_credits = total_earned_credits + v_dev_share
    where id = v_creator_id;

    -- Update agent stats
    update public.agents
    set
      total_earnings_credits = total_earnings_credits + v_dev_share,
      pending_payout_credits = pending_payout_credits + v_dev_share
    where id = p_agent_id;

    -- Check and update dev level
    perform public.update_dev_level(v_creator_id);
  end if;

  -- Transactions
  insert into public.credit_transactions (profile_id, amount, type, reference_id, description)
  values (p_client_id, -p_credits, 'task_charge', p_task_id::text,
    'Task charge: ' || p_credits || ' credits');

  if v_creator_id is not null then
    insert into public.credit_transactions (profile_id, amount, type, reference_id, description)
    values (v_creator_id, v_dev_share, 'bonus', p_task_id::text,
      'Revenue share (' || v_share_pct || '%): ' || v_dev_share || ' credits');
  end if;
end;
$$;

-- ── Agent boost / featured slots ─────────────────────────────────────────────
create table if not exists public.agent_boosts (
  id          uuid        default gen_random_uuid() primary key,
  agent_id    uuid        references public.agents(id) on delete cascade not null,
  boosted_by  uuid        references public.profiles(id) not null,
  credits_paid integer    not null check (credits_paid > 0),
  boost_type  text        not null check (boost_type in ('featured', 'homepage', 'category_top')),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists boosts_active_idx  on public.agent_boosts (is_active, ends_at) where is_active = true;
create index if not exists boosts_agent_idx   on public.agent_boosts (agent_id);

alter table public.agent_boosts enable row level security;
create policy "Boosts are public" on public.agent_boosts for select using (true);
create policy "Devs manage own boosts" on public.agent_boosts for insert with check (boosted_by = auth.uid());

-- Add is_boosted flag to agents (denormalized)
alter table public.agents
  add column if not exists is_boosted       boolean not null default false,
  add column if not exists boost_ends_at    timestamptz;

-- ── Developer invite tracking ─────────────────────────────────────────────────
-- Track which developers were invited by other developers (dev-to-dev referrals)
-- When a dev publishes their first agent via referral → referrer gets 500 bonus credits
create or replace function public.on_first_agent_published()
returns trigger language plpgsql security definer as $$
declare
  v_referrer_id uuid;
  v_bonus       integer := 500;
begin
  -- Only fire on first agent per developer
  if (select count(*) from public.agents where creator_id = new.creator_id) > 1 then
    return new;
  end if;

  -- Find who referred this developer
  select referred_by into v_referrer_id
  from public.profiles where id = new.creator_id;

  if v_referrer_id is null then return new; end if;

  -- Bonus to referrer for bringing in an active developer
  update public.profiles
  set balance = balance + v_bonus
  where id = v_referrer_id;

  insert into public.credit_transactions (profile_id, amount, type, description)
  values (v_referrer_id, v_bonus, 'bonus',
    'Developer referral bonus: a developer you invited published their first agent! +' || v_bonus || ' credits');

  return new;
end;
$$;

create trigger on_agent_published
  after insert on public.agents
  for each row execute procedure public.on_first_agent_published();

-- ── Marketplace stats view ────────────────────────────────────────────────────
create or replace view public.marketplace_stats as
select
  (select count(*) from public.agents where is_active = true)           as active_agents,
  (select count(*) from public.profiles where role = 'dev')             as total_developers,
  (select coalesce(sum(total_tasks_completed), 0) from public.agents)   as total_tasks_run,
  (select coalesce(sum(total_earned_credits), 0) from public.profiles where role = 'dev') as total_paid_to_devs,
  (select count(*) from public.tasks where status = 'running')          as tasks_running_now;

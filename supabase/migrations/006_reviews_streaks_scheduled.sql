-- ============================================================
-- GENESIS NODE – Reviews, Streaks, Scheduled Tasks
-- ============================================================

-- ── REVIEWS & RATINGS ────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id          uuid        default gen_random_uuid() primary key,
  agent_id    uuid        references public.agents(id) on delete cascade not null,
  reviewer_id uuid        references public.profiles(id) on delete cascade not null,
  rating      smallint    not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (agent_id, reviewer_id)   -- one review per user per agent
);

create index if not exists reviews_agent_idx    on public.reviews (agent_id);
create index if not exists reviews_reviewer_idx on public.reviews (reviewer_id);

-- RLS: anyone can read reviews, only task-completed users can write
alter table public.reviews enable row level security;

create policy "Reviews are publicly readable"
  on public.reviews for select using (true);

create policy "Authenticated users can post reviews"
  on public.reviews for insert
  with check (auth.uid() = reviewer_id);

create policy "Users can update own reviews"
  on public.reviews for update
  using (auth.uid() = reviewer_id);

-- Add avg_rating to agents (denormalized for performance)
alter table public.agents
  add column if not exists avg_rating      numeric(3,2),
  add column if not exists review_count    integer not null default 0;

-- Auto-update avg_rating on agents after review insert/update
create or replace function public.update_agent_rating()
returns trigger language plpgsql security definer as $$
begin
  update public.agents
  set
    avg_rating   = (select round(avg(rating)::numeric, 2) from public.reviews where agent_id = coalesce(new.agent_id, old.agent_id)),
    review_count = (select count(*) from public.reviews where agent_id = coalesce(new.agent_id, old.agent_id))
  where id = coalesce(new.agent_id, old.agent_id);
  return coalesce(new, old);
end;
$$;

create trigger on_review_change
  after insert or update or delete on public.reviews
  for each row execute procedure public.update_agent_rating();

-- ── STREAK SYSTEM ────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists current_streak   integer not null default 0,
  add column if not exists longest_streak   integer not null default 0,
  add column if not exists last_active_date date;

-- Function to update streak when user deploys a task
create or replace function public.update_streak(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_today        date := current_date;
  v_last_active  date;
  v_streak       integer;
  v_bonus        integer := 0;
begin
  select last_active_date, current_streak
  into v_last_active, v_streak
  from public.profiles where id = p_user_id;

  -- Already active today — no change
  if v_last_active = v_today then return; end if;

  -- Consecutive day — increment streak
  if v_last_active = v_today - 1 then
    v_streak := v_streak + 1;
  else
    v_streak := 1; -- streak broken
  end if;

  -- Milestone bonuses
  if v_streak in (3, 7, 14, 30) then
    v_bonus := v_streak * 10; -- 30cr, 70cr, 140cr, 300cr
    update public.profiles
    set balance = balance + v_bonus
    where id = p_user_id;

    insert into public.credit_transactions (profile_id, amount, type, description)
    values (p_user_id, v_bonus, 'bonus', v_streak || '-day streak bonus! +' || v_bonus || ' credits');
  end if;

  update public.profiles
  set
    current_streak   = v_streak,
    longest_streak   = greatest(longest_streak, v_streak),
    last_active_date = v_today
  where id = p_user_id;
end;
$$;

-- ── SCHEDULED TASKS ──────────────────────────────────────────────────────────
create table if not exists public.scheduled_tasks (
  id              uuid        default gen_random_uuid() primary key,
  client_id       uuid        references public.profiles(id) on delete cascade not null,
  agent_id        uuid        references public.agents(id)   on delete cascade not null,
  goal            text        not null,
  cron_expression text        not null,   -- e.g. "0 9 * * 1" = every Monday 9am
  label           text,                   -- friendly name
  is_active       boolean     not null default true,
  last_run_at     timestamptz,
  next_run_at     timestamptz,
  run_count       integer     not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists scheduled_tasks_client_idx on public.scheduled_tasks (client_id);
create index if not exists scheduled_tasks_active_idx on public.scheduled_tasks (is_active, next_run_at) where is_active = true;

alter table public.scheduled_tasks enable row level security;

create policy "Users manage own scheduled tasks"
  on public.scheduled_tasks for all
  using (client_id = auth.uid());

-- ── API KEYS ─────────────────────────────────────────────────────────────────
create table if not exists public.api_keys (
  id          uuid        default gen_random_uuid() primary key,
  profile_id  uuid        references public.profiles(id) on delete cascade not null,
  name        text        not null,
  key_hash    text        not null unique,  -- sha256 of the actual key
  key_prefix  text        not null,         -- first 8 chars for display: gn_live_XXXX...
  last_used   timestamptz,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz
);

create index if not exists api_keys_profile_idx  on public.api_keys (profile_id);
create index if not exists api_keys_hash_idx     on public.api_keys (key_hash);

alter table public.api_keys enable row level security;

create policy "Users manage own API keys"
  on public.api_keys for all
  using (profile_id = auth.uid());

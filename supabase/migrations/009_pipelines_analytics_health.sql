-- ================================================================
-- GENESIS NODE — Pipelines + Analytics + Health Monitor
-- ================================================================

-- ── 1. AGENT PIPELINES ───────────────────────────────────────────

create table if not exists public.pipelines (
  id               uuid        default gen_random_uuid() primary key,
  creator_id       uuid        references public.profiles(id) on delete cascade not null,
  name             text        not null,
  slug             text        unique not null,
  description      text,
  long_description text,
  -- Ordered array: [{agent_id, agent_name, description, order}]
  steps            jsonb       not null default '[]',
  price_per_run    integer     not null default 100 check (price_per_run >= 10),
  tags             text[]      not null default '{}',
  category_slug    text        references public.categories(slug),
  is_active        boolean     not null default true,
  is_featured      boolean     not null default false,
  total_runs       integer     not null default 0,
  avg_rating       numeric(3,2),
  review_count     integer     not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists pipelines_active_idx on public.pipelines(is_active, total_runs desc);

alter table public.pipelines enable row level security;
create policy "Pipelines are public"            on public.pipelines for select using (true);
create policy "Creators manage own pipelines"   on public.pipelines for insert with check (creator_id = auth.uid());
create policy "Creators update own pipelines"   on public.pipelines for update using (creator_id = auth.uid());

-- Pipeline executions (one per client run)
create table if not exists public.pipeline_executions (
  id             uuid        default gen_random_uuid() primary key,
  pipeline_id    uuid        references public.pipelines(id) on delete cascade not null,
  client_id      uuid        references public.profiles(id) not null,
  initial_goal   text        not null,
  current_step   integer     not null default 0,   -- 0-based index
  total_steps    integer     not null,
  status         text        not null default 'running'
                             check (status in ('running','completed','failed','cancelled')),
  final_result   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.pipeline_executions enable row level security;
create policy "Users see own executions" on public.pipeline_executions for select using (client_id = auth.uid());

-- Link individual tasks to pipeline executions
alter table public.tasks
  add column if not exists pipeline_execution_id uuid references public.pipeline_executions(id),
  add column if not exists pipeline_step         integer;  -- which step index this task is

create index if not exists tasks_pipeline_idx on public.tasks(pipeline_execution_id);

-- Charge function for pipeline (charges once upfront)
create or replace function public.charge_pipeline(
  p_client_id     uuid,
  p_pipeline_id   uuid,
  p_execution_id  uuid,
  p_credits       integer
) returns void language plpgsql security definer as $$
begin
  update public.profiles
  set balance = balance - p_credits
  where id = p_client_id and balance >= p_credits;

  if not found then
    raise exception 'Insufficient credits';
  end if;

  insert into public.credit_transactions (profile_id, amount, type, reference_id, description)
  values (p_client_id, -p_credits, 'task_charge', p_execution_id::text,
    'Pipeline run: ' || p_credits || ' credits');
end;
$$;

-- ── 2. ANALYTICS VIEWS ──────────────────────────────────────────

-- Daily revenue per developer (last 90 days)
create or replace view public.developer_daily_revenue as
select
  ct.profile_id                               as developer_id,
  date_trunc('day', ct.created_at)::date      as day,
  sum(ct.amount)                              as credits_earned,
  count(*)                                    as transactions
from public.credit_transactions ct
where ct.type in ('bonus', 'task_charge')
  and ct.amount > 0
  and ct.created_at >= now() - interval '90 days'
group by ct.profile_id, date_trunc('day', ct.created_at)::date;

-- Per-agent stats (for developer analytics)
create or replace view public.agent_analytics as
select
  a.id                                              as agent_id,
  a.creator_id,
  a.name,
  a.slug,
  a.price_per_task,
  a.total_tasks_completed,
  a.total_earnings_credits,
  a.pending_payout_credits,
  a.avg_rating,
  a.review_count,
  a.fee_reduction_pct,
  -- tasks last 7 days
  coalesce((
    select count(*) from public.tasks t
    where t.agent_id = a.id
      and t.status = 'completed'
      and t.created_at >= now() - interval '7 days'
  ), 0)                                             as tasks_last_7d,
  -- tasks last 30 days
  coalesce((
    select count(*) from public.tasks t
    where t.agent_id = a.id
      and t.status = 'completed'
      and t.created_at >= now() - interval '30 days'
  ), 0)                                             as tasks_last_30d,
  -- unique clients
  coalesce((
    select count(distinct t.client_id) from public.tasks t
    where t.agent_id = a.id and t.status = 'completed'
  ), 0)                                             as unique_clients,
  -- completion rate (completed / total attempted)
  case
    when (select count(*) from public.tasks t where t.agent_id = a.id) = 0 then null
    else round(
      (select count(*) from public.tasks t where t.agent_id = a.id and t.status = 'completed')::numeric /
      (select count(*) from public.tasks t where t.agent_id = a.id)::numeric * 100, 1
    )
  end                                               as completion_rate_pct,
  -- avg task duration seconds (completed tasks with timing)
  coalesce((
    select avg(extract(epoch from (t.updated_at - t.created_at)))::integer
    from public.tasks t
    where t.agent_id = a.id and t.status = 'completed'
  ), 0)                                             as avg_duration_seconds
from public.agents a;

-- ── 3. HEALTH MONITORING ────────────────────────────────────────

create type public.health_status as enum ('healthy', 'degraded', 'down', 'unknown');

create table if not exists public.agent_health_logs (
  id            uuid          default gen_random_uuid() primary key,
  agent_id      uuid          references public.agents(id) on delete cascade not null,
  status        health_status not null default 'unknown',
  response_ms   integer,        -- how long the check took
  error_message text,
  checked_at    timestamptz   not null default now()
);

create index if not exists health_logs_agent_idx on public.agent_health_logs(agent_id, checked_at desc);

-- Add health columns to agents
alter table public.agents
  add column if not exists health_status          text    not null default 'unknown'
    check (health_status in ('healthy','degraded','down','unknown')),
  add column if not exists health_checked_at      timestamptz,
  add column if not exists health_fail_streak     integer not null default 0,
  add column if not exists is_verified            boolean not null default false,
  add column if not exists verified_at            timestamptz,
  add column if not exists uptime_30d_pct         numeric(5,2);

-- View: agents with computed uptime
create or replace view public.agent_health_summary as
select
  a.id,
  a.name,
  a.slug,
  a.health_status,
  a.health_checked_at,
  a.health_fail_streak,
  a.is_verified,
  a.uptime_30d_pct,
  a.total_tasks_completed,
  -- count checks last 30d
  coalesce((
    select count(*) from public.agent_health_logs h
    where h.agent_id = a.id and h.checked_at >= now() - interval '30 days'
  ), 0)                             as checks_last_30d,
  -- count healthy checks last 30d
  coalesce((
    select count(*) from public.agent_health_logs h
    where h.agent_id = a.id and h.status = 'healthy'
      and h.checked_at >= now() - interval '30 days'
  ), 0)                             as healthy_checks_last_30d
from public.agents a;

-- Function: update agent health after a check
create or replace function public.record_health_check(
  p_agent_id    uuid,
  p_ok          boolean,
  p_response_ms integer default null,
  p_error       text    default null
) returns void language plpgsql security definer as $$
declare
  v_new_status   health_status;
  v_fail_streak  integer;
  v_uptime       numeric;
  v_total_checks integer;
  v_ok_checks    integer;
begin
  -- Current fail streak
  select health_fail_streak into v_fail_streak from public.agents where id = p_agent_id;

  if p_ok then
    v_fail_streak := 0;
    v_new_status  := 'healthy';
  else
    v_fail_streak := coalesce(v_fail_streak, 0) + 1;
    v_new_status  := case
      when v_fail_streak >= 5 then 'down'
      when v_fail_streak >= 2 then 'degraded'
      else 'degraded'
    end;
  end if;

  -- Compute 30d uptime
  select
    count(*),
    count(*) filter (where status = 'healthy')
  into v_total_checks, v_ok_checks
  from public.agent_health_logs
  where agent_id = p_agent_id
    and checked_at >= now() - interval '30 days';

  -- Include this new check
  v_total_checks := v_total_checks + 1;
  if p_ok then v_ok_checks := v_ok_checks + 1; end if;

  if v_total_checks > 0 then
    v_uptime := round((v_ok_checks::numeric / v_total_checks::numeric) * 100, 2);
  else
    v_uptime := null;
  end if;

  -- Log check
  insert into public.agent_health_logs (agent_id, status, response_ms, error_message)
  values (p_agent_id, v_new_status, p_response_ms, p_error);

  -- Update agent
  update public.agents
  set
    health_status     = v_new_status::text,
    health_checked_at = now(),
    health_fail_streak = v_fail_streak,
    uptime_30d_pct    = v_uptime,
    -- Auto-verify: healthy + 99%+ uptime + 10+ checks + 5+ completed tasks
    is_verified = (
      v_new_status = 'healthy'
      and v_uptime >= 99.0
      and (v_total_checks) >= 10
      and total_tasks_completed >= 5
    ),
    verified_at = case
      when (v_new_status = 'healthy' and v_uptime >= 99.0 and (v_total_checks) >= 10 and total_tasks_completed >= 5)
        then coalesce(verified_at, now())
      else null
    end
  where id = p_agent_id;

  -- If agent goes down, deactivate it from featured
  if v_new_status = 'down' then
    update public.agents
    set is_featured = false
    where id = p_agent_id;
  end if;
end;
$$;

-- ── 4. PIPELINE REVENUE DISTRIBUTION ────────────────────────────
-- Called when a pipeline execution completes
-- Splits revenue proportionally between all step agents

create or replace function public.distribute_pipeline_revenue(
  p_execution_id uuid
) returns void language plpgsql security definer as $$
declare
  v_pipeline_id    uuid;
  v_client_id      uuid;
  v_total_credits  integer;
  v_steps          jsonb;
  v_step_count     integer;
  v_credits_each   integer;
  v_step           jsonb;
  v_agent_id       uuid;
  v_creator_id     uuid;
  v_level          dev_level;
  v_share_pct      integer;
  v_dev_earn       integer;
begin
  select pipeline_id, client_id into v_pipeline_id, v_client_id
  from public.pipeline_executions where id = p_execution_id;

  select price_per_run, steps into v_total_credits, v_steps
  from public.pipelines where id = v_pipeline_id;

  v_step_count := jsonb_array_length(v_steps);
  if v_step_count = 0 then return; end if;

  v_credits_each := floor(v_total_credits / v_step_count);

  -- Pay each step's agent developer
  for v_step in select * from jsonb_array_elements(v_steps) loop
    v_agent_id := (v_step->>'agent_id')::uuid;

    select a.creator_id, p.dev_level
    into v_creator_id, v_level
    from public.agents a
    join public.profiles p on p.id = a.creator_id
    where a.id = v_agent_id;

    if v_creator_id is null then continue; end if;

    v_share_pct := public.get_dev_share_pct(v_level);
    v_dev_earn  := floor(v_credits_each * v_share_pct / 100);

    update public.profiles
    set total_earned_credits = total_earned_credits + v_dev_earn
    where id = v_creator_id;

    update public.agents
    set
      total_earnings_credits = total_earnings_credits + v_dev_earn,
      pending_payout_credits = pending_payout_credits + v_dev_earn,
      total_tasks_completed  = total_tasks_completed + 1
    where id = v_agent_id;

    perform public.update_dev_level(v_creator_id);
  end loop;

  -- Increment pipeline run count
  update public.pipelines
  set total_runs = total_runs + 1
  where id = v_pipeline_id;
end;
$$;

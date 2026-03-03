-- ============================================================
-- GENESIS NODE – Revenue Share System
-- Developer earns 70% of every credit spent on their agent
-- Platform keeps 30%
-- ============================================================

-- Add developer earnings tracking to agents
alter table public.agents
  add column if not exists total_earnings_credits  integer not null default 0,
  add column if not exists pending_payout_credits   integer not null default 0;

-- Add developer payout tracking to profiles
alter table public.profiles
  add column if not exists total_earned_credits     integer not null default 0,
  add column if not exists total_paid_out_credits   integer not null default 0;

-- ── Payouts table ─────────────────────────────────────────────────────────────
create table if not exists public.payouts (
  id              uuid        default gen_random_uuid() primary key,
  developer_id    uuid        references public.profiles(id) on delete cascade not null,
  credits_amount  integer     not null check (credits_amount > 0),
  usd_amount      numeric(10,2) not null,
  status          text        not null check (status in ('pending','processing','paid','failed')) default 'pending',
  stripe_transfer_id text,
  period_start    timestamptz not null,
  period_end      timestamptz not null,
  created_at      timestamptz not null default now(),
  paid_at         timestamptz
);

create index if not exists payouts_dev_idx on public.payouts (developer_id);
create index if not exists payouts_status_idx on public.payouts (status);

-- RLS on payouts
alter table public.payouts enable row level security;

create policy "Developers see own payouts"
  on public.payouts for select
  using (developer_id = auth.uid());

-- ── Update charge_task function to split revenue ──────────────────────────────
-- Replaces the original in 001_initial_schema.sql
create or replace function public.charge_task(
  p_client_id uuid,
  p_agent_id  uuid,
  p_task_id   uuid,
  p_credits   integer
) returns void language plpgsql security definer as $$
declare
  v_dev_share    integer;
  v_creator_id   uuid;
begin
  -- Deduct from client balance
  update public.profiles
  set balance = balance - p_credits
  where id = p_client_id and balance >= p_credits;

  if not found then
    raise exception 'Insufficient credits';
  end if;

  -- Get agent creator
  select creator_id into v_creator_id
  from public.agents where id = p_agent_id;

  -- 70% to developer
  v_dev_share := floor(p_credits * 0.7);

  -- Credit developer's pending payout
  if v_creator_id is not null then
    update public.profiles
    set total_earned_credits = total_earned_credits + v_dev_share
    where id = v_creator_id;

    update public.agents
    set
      total_earnings_credits = total_earnings_credits + v_dev_share,
      pending_payout_credits = pending_payout_credits + v_dev_share
    where id = p_agent_id;
  end if;

  -- Log transaction for client
  insert into public.credit_transactions
    (profile_id, amount, type, reference_id, description)
  values
    (p_client_id, -p_credits, 'task_charge', p_task_id::text,
     'Task charge: ' || p_credits || ' credits');

  -- Log revenue share for developer
  if v_creator_id is not null then
    insert into public.credit_transactions
      (profile_id, amount, type, reference_id, description)
    values
      (v_creator_id, v_dev_share, 'bonus', p_task_id::text,
       'Revenue share (70%): ' || v_dev_share || ' credits from task');
  end if;
end;
$$;

-- ── View: developer earnings summary ──────────────────────────────────────────
create or replace view public.developer_earnings as
select
  p.id                                           as developer_id,
  p.display_name,
  p.total_earned_credits,
  p.total_paid_out_credits,
  (p.total_earned_credits - p.total_paid_out_credits) as pending_credits,
  -- Convert to USD: 100 credits = $1.00
  round(p.total_earned_credits::numeric / 100, 2)     as total_earned_usd,
  round((p.total_earned_credits - p.total_paid_out_credits)::numeric / 100, 2) as pending_usd,
  count(distinct a.id)                               as agent_count,
  sum(a.total_tasks_completed)                       as total_tasks
from public.profiles p
left join public.agents a on a.creator_id = p.id
where p.role = 'dev'
group by p.id, p.display_name, p.total_earned_credits, p.total_paid_out_credits;

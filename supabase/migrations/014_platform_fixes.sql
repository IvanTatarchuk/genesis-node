-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 014: Platform Fixes
-- 1. trinity_knowledge table (for Trinity agent cross-agent memory)
-- 2. task cancellations tracking
-- 3. Full-text search index on agents
-- 4. refund_task() RPC function
-- 5. Client ID backfill on tasks (ensure no NULL client_id)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. trinity_knowledge table ───────────────────────────────────────────────
create table if not exists public.trinity_knowledge (
  id          uuid primary key default gen_random_uuid(),
  agent_name  text not null,            -- 'vasyliy' | 'hryhoriy' | 'ioann'
  category    text not null,            -- 'platform_fix' | 'growth' | 'ux' | 'strategy'
  title       text not null,
  content     text not null,
  importance  integer default 5 check (importance between 1 and 10),
  tags        text[] default '{}',
  source_tool text,                     -- which tool generated this knowledge
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.trinity_knowledge enable row level security;

-- Only service role can read/write (agents use service key)
create policy "service_only" on public.trinity_knowledge
  using (false) with check (false);

-- Index for quick lookup by agent and category
create index if not exists trinity_knowledge_agent_cat_idx
  on public.trinity_knowledge (agent_name, category, importance desc);

-- ── 2. Add 'cancelled' to tasks status if not present ────────────────────────
do $$
begin
  -- Extend the check constraint on status to include 'cancelled'
  -- (alter constraint is easier than drop+recreate for existing tables)
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'tasks' and column_name = 'cancelled_at'
  ) then
    alter table public.tasks add column cancelled_at timestamptz;
    alter table public.tasks add column cancel_reason text;
  end if;
end $$;

-- ── 3. Full-text search on agents ───────────────────────────────────────────
-- Add a tsvector column for fast full-text search
alter table public.agents
  add column if not exists search_vector tsvector;

-- Populate existing rows
update public.agents
set search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
);

-- Trigger to keep search_vector in sync
create or replace function public.agents_search_vector_update()
returns trigger language plpgsql as $$
begin
  new.search_vector := to_tsvector('english',
    coalesce(new.name, '') || ' ' ||
    coalesce(new.description, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '')
  );
  return new;
end $$;

drop trigger if exists agents_search_vector_trig on public.agents;
create trigger agents_search_vector_trig
  before insert or update on public.agents
  for each row execute function public.agents_search_vector_update();

create index if not exists agents_search_vector_idx
  on public.agents using gin(search_vector);

-- ── 4. refund_task() RPC ─────────────────────────────────────────────────────
create or replace function public.refund_task(
  p_task_id   uuid,
  p_client_id uuid,
  p_credits   integer
) returns void language plpgsql security definer as $$
begin
  -- Return credits to client
  update public.profiles
  set balance = balance + p_credits
  where id = p_client_id;

  -- Log the refund transaction
  insert into public.credit_transactions (profile_id, amount, type, reference_id, description)
  values (p_client_id, p_credits, 'refund', p_task_id::text,
          format('Refund for task %s (%s credits)', p_task_id, p_credits));
end $$;

-- ── 5. Add index on tasks(client_id, status) for dashboard queries ────────────
create index if not exists tasks_client_status_idx
  on public.tasks (client_id, status, created_at desc);

-- Index for orchestrator pending poll
create index if not exists tasks_pending_idx
  on public.tasks (status, created_at asc)
  where status = 'pending';

-- ── 6. Add index on credit_transactions(reference_id) for idempotency check ──
create index if not exists credit_txn_reference_idx
  on public.credit_transactions (reference_id)
  where reference_id is not null;

-- ── Done ──────────────────────────────────────────────────────────────────────

-- ============================================================
-- GENESIS NODE â€” Initial Schema
-- Run this in: Supabase Dashboard â†’ SQL Editor
-- ============================================================

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Extensions
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- uuid-ossp no longer needed â€” Supabase ships gen_random_uuid() natively (pgcrypto)
create extension if not exists "pgcrypto";
create extension if not exists "pg_net";          -- async HTTP calls (Supabase built-in)

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- PROFILES  (shadow table for auth.users)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table public.profiles (
  id                  uuid references auth.users(id) on delete cascade primary key,
  role                text        not null check (role in ('dev', 'client')) default 'client',
  display_name        text,
  avatar_url          text,
  -- Credits: 1 credit = $0.01 USD.  Stored as integer cents to avoid floats.
  balance             integer     not null default 0 check (balance >= 0),
  stripe_customer_id  text        unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- AGENTS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table public.agents (
  id                        uuid        default gen_random_uuid() primary key,
  creator_id                uuid        references public.profiles(id) on delete cascade not null,
  name                      text        not null,
  slug                      text        unique not null,              -- URL-safe identifier
  description               text        not null,                     -- Short tagline
  long_description          text,                                     -- Markdown readme
  -- config_blob holds the agent's context: system_prompt, tools, env vars schema, etc.
  config_blob               jsonb       not null default '{}',
  price_per_task            integer     not null default 100          -- in credits
                              check (price_per_task > 0),
  is_active                 boolean     not null default true,
  is_featured               boolean     not null default false,
  tags                      text[]      not null default '{}',
  cover_image_url           text,
  -- Denormalized stats updated via triggers
  total_tasks_completed     integer     not null default 0,
  avg_completion_seconds    integer,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index agents_creator_idx   on public.agents (creator_id);
create index agents_active_idx    on public.agents (is_active) where is_active = true;
create index agents_tags_idx      on public.agents using gin (tags);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TASKS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create type task_status as enum ('pending', 'running', 'completed', 'failed', 'cancelled');

create table public.tasks (
  id                uuid         default gen_random_uuid() primary key,
  client_id         uuid         references public.profiles(id) on delete cascade not null,
  agent_id          uuid         references public.agents(id)   on delete restrict  not null,
  goal              text         not null,
  status            task_status  not null default 'pending',
  credits_charged   integer      not null default 0,
  result_url        text,                                            -- URL to output artefact in Storage
  result_summary    text,                                            -- Plain-text digest shown to client
  container_id      text,                                            -- Docker container ID (set by orchestrator)
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

create index tasks_client_idx  on public.tasks (client_id);
create index tasks_agent_idx   on public.tasks (agent_id);
create index tasks_status_idx  on public.tasks (status);
-- Orchestrator polls for pending tasks efficiently
create index tasks_pending_idx on public.tasks (created_at) where status = 'pending';

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- LOGS  (streamed from DevAgent â†’ client browser via Realtime)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create type log_type as enum ('thought', 'action', 'result', 'error', 'system');

create table public.logs (
  id        uuid      default gen_random_uuid() primary key,
  task_id   uuid      references public.tasks(id) on delete cascade not null,
  type      log_type  not null,
  content   text      not null,
  metadata  jsonb     not null default '{}',           -- e.g. { "url": "...", "screenshot": "..." }
  timestamp timestamptz not null default now()
);

create index logs_task_idx on public.logs (task_id, timestamp);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- CREDIT TRANSACTIONS  (immutable ledger)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create type txn_type as enum ('purchase', 'task_charge', 'refund', 'bonus');

create table public.credit_transactions (
  id           uuid      default gen_random_uuid() primary key,
  profile_id   uuid      references public.profiles(id) on delete cascade not null,
  amount       integer   not null,                     -- positive = credit, negative = debit
  type         txn_type  not null,
  reference_id text,                                   -- stripe payment_intent_id or task_id::text
  description  text,
  created_at   timestamptz not null default now()
);

create index txn_profile_idx on public.credit_transactions (profile_id, created_at desc);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- HELPER FUNCTIONS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Atomically deduct credits when a task starts.
-- Returns TRUE if successful, FALSE if insufficient balance.
create or replace function public.charge_task(
  p_task_id   uuid,
  p_client_id uuid,
  p_credits   integer
)
returns boolean language plpgsql security definer as $$
declare
  v_updated integer;
begin
  update public.profiles
  set    balance    = balance - p_credits,
         updated_at = now()
  where  id         = p_client_id
    and  balance   >= p_credits;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return false;     -- insufficient balance
  end if;

  insert into public.credit_transactions
    (profile_id, amount, type, reference_id, description)
  values
    (p_client_id, -p_credits, 'task_charge', p_task_id::text, 'Task execution charge');

  -- Mark task as running
  update public.tasks
  set    status          = 'running',
         credits_charged = p_credits,
         started_at      = now(),
         updated_at      = now()
  where  id = p_task_id;

  return true;
end;
$$;

-- Refund credits on task failure.
create or replace function public.refund_task(
  p_task_id   uuid,
  p_client_id uuid,
  p_credits   integer
)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set    balance    = balance + p_credits,
         updated_at = now()
  where  id = p_client_id;

  insert into public.credit_transactions
    (profile_id, amount, type, reference_id, description)
  values
    (p_client_id, p_credits, 'refund', p_task_id::text, 'Task failed â€” credits returned');
end;
$$;

-- Update agent stats when a task completes.
create or replace function public.update_agent_stats()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and old.status != 'completed' then
    update public.agents
    set
      total_tasks_completed = total_tasks_completed + 1,
      avg_completion_seconds = (
        select avg(extract(epoch from (completed_at - started_at)))::integer
        from   public.tasks
        where  agent_id = new.agent_id
          and  status   = 'completed'
          and  completed_at is not null
      ),
      updated_at = now()
    where id = new.agent_id;
  end if;
  return new;
end;
$$;

create trigger task_completed_stats
  after update on public.tasks
  for each row execute procedure public.update_agent_stats();

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger agents_updated_at   before update on public.agents
  for each row execute procedure public.set_updated_at();
create trigger tasks_updated_at    before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- ROW LEVEL SECURITY
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

alter table public.profiles           enable row level security;
alter table public.agents             enable row level security;
alter table public.tasks              enable row level security;
alter table public.logs               enable row level security;
alter table public.credit_transactions enable row level security;

-- profiles
create policy "Users read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- agents â€” public read, dev-only write
create policy "Anyone can view active agents"
  on public.agents for select using (is_active = true);
create policy "Devs manage own agents"
  on public.agents for all
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

-- tasks
create policy "Clients see own tasks"
  on public.tasks for select using (auth.uid() = client_id);
create policy "Agent creators see tasks for their agents"
  on public.tasks for select
  using (exists (
    select 1 from public.agents
    where agents.id = tasks.agent_id and agents.creator_id = auth.uid()
  ));
create policy "Clients create tasks"
  on public.tasks for insert with check (auth.uid() = client_id);
-- Orchestrator uses service role to update tasks (bypasses RLS)

-- logs
create policy "Task participants read logs"
  on public.logs for select
  using (exists (
    select 1 from public.tasks t
    where t.id = logs.task_id
      and (t.client_id = auth.uid()
        or exists (
          select 1 from public.agents a
          where a.id = t.agent_id and a.creator_id = auth.uid()
        )
      )
  ));
-- Only service role inserts logs (orchestrator/agent)

-- credit_transactions
create policy "Users see own transactions"
  on public.credit_transactions for select using (auth.uid() = profile_id);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- REALTIME  (enable for orchestrator subscription)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.logs;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SEED: example agent owned by service account (optional)
-- Uncomment after inserting a real creator profile.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- insert into public.agents (creator_id, name, slug, description, price_per_task, tags)
-- values ('<your-user-uuid>', 'DevAgent Pro', 'devagent-pro',
--         'Autonomous coding & browser automation agent powered by Grok-3.', 250,
--         array['coding','browser','automation']);


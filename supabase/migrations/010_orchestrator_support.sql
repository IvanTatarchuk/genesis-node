-- ── Support columns for orchestrator ────────────────────────────────────────

-- result_text: final output of agent task
alter table public.tasks
  add column if not exists result_text  text,
  add column if not exists started_at   timestamptz,
  add column if not exists completed_at timestamptz;

-- logs: ensure task_id can be a placeholder for system logs
alter table public.logs
  alter column task_id drop not null;

-- Darwin system account profile (will be created via SQL)
-- We insert a system profile that Darwin uses as creator
-- Replace DARWIN_UUID with actual UUID after running this migration

-- Create Darwin's profile if not exists (use a fixed UUID)
insert into public.profiles (id, role, display_name, avatar_url, balance)
values (
  '00000000-0000-0000-0000-d4rw1n000001'::uuid,
  'dev',
  'Darwin AI',
  null,
  999999
)
on conflict (id) do nothing;

-- Index for orchestrator polling
create index if not exists tasks_status_pending_idx
  on public.tasks (status, created_at)
  where status = 'pending';

create index if not exists tasks_status_running_idx
  on public.tasks (status, started_at)
  where status = 'running';

-- ============================================================
-- GENESIS NODE – Marketplace: Favorites, Reports, Collections
-- ============================================================

-- ── Saved agents (favorites) ─────────────────────────────────────────────────
create table if not exists public.saved_agents (
  user_id    uuid references public.profiles(id) on delete cascade not null,
  agent_id   uuid references public.agents(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, agent_id)
);

create index if not exists saved_agents_user_idx  on public.saved_agents (user_id);
create index if not exists saved_agents_agent_idx on public.saved_agents (agent_id);

alter table public.saved_agents enable row level security;

create policy "Users see own saved"
  on public.saved_agents for select using (auth.uid() = user_id);

create policy "Users manage own saved"
  on public.saved_agents for all using (auth.uid() = user_id);

-- ── Agent reports (flag inappropriate) ──────────────────────────────────────
create table if not exists public.agent_reports (
  id         uuid        default gen_random_uuid() primary key,
  reporter_id uuid       references public.profiles(id) on delete cascade not null,
  agent_id   uuid        references public.agents(id) on delete cascade not null,
  reason     text        not null check (reason in ('spam', 'harmful', 'misleading', 'copyright', 'other')),
  details    text,
  status     text        not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists agent_reports_agent_idx   on public.agent_reports (agent_id);
create index if not exists agent_reports_status_idx on public.agent_reports (status);

alter table public.agent_reports enable row level security;

create policy "Users can submit reports"
  on public.agent_reports for insert with check (auth.uid() = reporter_id);

create policy "Users see own reports"
  on public.agent_reports for select using (auth.uid() = reporter_id);

-- ── Collections (curated lists: Staff picks, For developers) ──────────────────
create table if not exists public.collections (
  id          uuid        default gen_random_uuid() primary key,
  slug        text        unique not null,
  name        text        not null,
  description text,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.collection_agents (
  collection_id uuid references public.collections(id) on delete cascade not null,
  agent_id      uuid references public.agents(id) on delete cascade not null,
  position      int not null default 0,
  primary key (collection_id, agent_id)
);

create index if not exists collection_agents_collection_idx on public.collection_agents (collection_id);

alter table public.collections enable row level security;
alter table public.collection_agents enable row level security;

create policy "Collections are public"
  on public.collections for select using (true);

create policy "Collection agents are public"
  on public.collection_agents for select using (true);

-- Seed default collections
insert into public.collections (slug, name, description, sort_order) values
  ('staff-picks', 'Staff picks', 'Hand-picked agents we recommend', 1),
  ('for-developers', 'For developers', 'Agents for code, APIs, and dev workflows', 2)
on conflict (slug) do nothing;

-- ── Verified developer (optional badge for creators) ───────────────────────────
alter table public.profiles
  add column if not exists verified_developer boolean not null default false;

comment on column public.profiles.verified_developer is 'Platform-verified developer badge (set by admin)';

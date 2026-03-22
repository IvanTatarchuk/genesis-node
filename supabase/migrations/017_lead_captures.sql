-- Lead capture for growth (e.g. "Get 100 extra credits" email signup)
create table if not exists public.lead_captures (
  id         uuid        default gen_random_uuid() primary key,
  email      text        not null,
  source     text        not null default 'homepage',
  created_at timestamptz not null default now()
);

create index if not exists lead_captures_email_idx on public.lead_captures (email);
create index if not exists lead_captures_created_idx on public.lead_captures (created_at desc);

alter table public.lead_captures enable row level security;

-- Only service role can insert (public form will call API that uses service client)
create policy "No anon access"
  on public.lead_captures for all
  using (false)
  with check (false);

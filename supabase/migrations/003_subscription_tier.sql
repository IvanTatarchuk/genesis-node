-- ============================================================
-- GENESIS NODE – Add subscription support
-- ============================================================

-- Add subscription_tier to profiles
alter table public.profiles
  add column if not exists subscription_tier  text check (subscription_tier in ('free','starter','pro','agency')) not null default 'free',
  add column if not exists subscription_id    text,         -- Stripe subscription ID
  add column if not exists subscription_ends  timestamptz;  -- null = active or free

-- Index for subscription queries
create index if not exists profiles_subscription_idx on public.profiles (subscription_tier);

-- Monthly credit allowance per tier (in credits)
-- Starter  = $19/mo  → 2000 credits
-- Pro      = $49/mo  → 6000 credits
-- Agency   = $99/mo  → 15000 credits
comment on column public.profiles.subscription_tier is 'free=0, starter=2000/mo, pro=6000/mo, agency=15000/mo';

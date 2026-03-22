-- ============================================================
-- 021: Security Hardening Part 2
-- Fix ALL remaining "Function Search Path Mutable" warnings
-- Uses ALTER FUNCTION to add SET search_path = public
-- ============================================================

-- Functions from 001_initial_schema
alter function public.handle_new_user() set search_path = public;
alter function public.update_agent_stats() set search_path = public;
alter function public.set_updated_at() set search_path = public;

-- Functions from 005_referral_system
alter function public.generate_referral_code() set search_path = public;

-- Functions from 006_reviews_streaks
alter function public.update_agent_rating() set search_path = public;
alter function public.update_streak(uuid) set search_path = public;

-- Functions from 007_leaderboard_rewards
alter function public.distribute_leaderboard_rewards(date, date) set search_path = public;

-- Functions from 008_marketplace
alter function public.get_dev_share_pct(public.dev_level) set search_path = public;
alter function public.update_dev_level(uuid) set search_path = public;
alter function public.charge_task(uuid, uuid, uuid, integer) set search_path = public;
alter function public.on_first_agent_published() set search_path = public;

-- Functions from 009_pipelines_analytics_health
alter function public.charge_pipeline(uuid, uuid, uuid, integer) set search_path = public;
alter function public.record_health_check(uuid, boolean, integer, text) set search_path = public;

-- Functions from 011_welcome_credits_notifications
alter function public.create_notification(uuid, text, text, text, text) set search_path = public;
alter function public.give_welcome_credits() set search_path = public;
alter function public.notify_task_status() set search_path = public;
alter function public.notify_dev_earnings() set search_path = public;

-- Functions from trinity schema.sql
alter function public.prune_trinity_memory() set search_path = public;
alter function public.clean_trinity_messages() set search_path = public;

-- Matadora functions (created directly in DB without migration file)
-- get_matadora_stats: returns platform-wide MATADORA statistics
create or replace function public.get_matadora_stats()
returns table(total_earned numeric, total_wallets bigint, avg_balance numeric)
language plpgsql security definer
set search_path = public
as $$
begin
  return query
  select
    coalesce(sum(total_earned), 0)::numeric          as total_earned,
    count(*)                                          as total_wallets,
    coalesce(avg(balance), 0)::numeric(12,2)          as avg_balance
  from public.matadora_wallets;
end;
$$;

-- earn_matadora_on_task_complete: trigger-style helper called on task completion
create or replace function public.earn_matadora_on_task_complete()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- Award 5 MATADORA for completing a task
  if new.status = 'completed' and old.status != 'completed' then
    -- Upsert wallet
    insert into public.matadora_wallets (profile_id, balance, total_earned)
    values (new.client_id, 5, 5)
    on conflict (profile_id) do update
    set
      balance      = matadora_wallets.balance + 5,
      total_earned = matadora_wallets.total_earned + 5,
      updated_at   = now();

    -- Log transaction
    insert into public.matadora_transactions (profile_id, amount, type, description, reference_id)
    values (new.client_id, 5, 'earned', 'Task completed', new.id::text)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- refund_task (014)
alter function public.refund_task(uuid, uuid, integer) set search_path = public;

-- agents_search_vector_update already fixed in 020
-- assign_referral_code already fixed in 020
-- apply_referral already fixed in 020

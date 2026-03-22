-- ============================================================
-- 018: Platform Economy Summary
-- Aggregates credit flows and payouts into simple views
-- ============================================================

-- View: platform_economy_summary
-- Uses credit_transactions as the single source of truth for credit flows.
create or replace view public.platform_economy_summary as
select
  coalesce(sum(case when type = 'purchase' and amount > 0  then amount end), 0)                      as total_credits_purchased,
  coalesce(sum(case when type = 'task_charge' and amount < 0 then -amount end), 0)                   as total_credits_spent_on_tasks,
  coalesce(sum(case when type = 'refund' and amount > 0      then amount end), 0)                    as total_credits_refunded,
  coalesce(sum(case when type = 'bonus' and amount > 0       then amount end), 0)                    as total_bonus_credits,
  coalesce(count(*) filter (where type = 'purchase'), 0)                                            as purchases_count,
  coalesce(count(*) filter (where type = 'task_charge'), 0)                                         as task_charges_count,
  coalesce(count(*) filter (where type = 'refund'), 0)                                              as refunds_count,
  coalesce(count(*) filter (where type = 'bonus'), 0)                                               as bonus_events_count
from public.credit_transactions;


-- View: platform_payouts_summary
-- Summarises developer payouts in credits and USD.
create or replace view public.platform_payouts_summary as
select
  coalesce(sum(credits_amount) filter (where status in ('pending','processing')), 0)                 as pending_payout_credits,
  coalesce(sum(usd_amount)     filter (where status in ('pending','processing')), 0)::numeric(10,2) as pending_payout_usd,
  coalesce(sum(credits_amount) filter (where status = 'paid'), 0)                                   as paid_payout_credits,
  coalesce(sum(usd_amount)     filter (where status = 'paid'), 0)::numeric(10,2)                    as paid_payout_usd,
  coalesce(count(*)            filter (where status = 'paid'), 0)                                   as paid_payout_count,
  coalesce(count(*)            filter (where status in ('pending','processing')), 0)                as pending_payout_count
from public.payouts;


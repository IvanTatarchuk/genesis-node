-- ============================================================
-- 019: Forecasts & Agent Metrics
-- Simple ARR / MATADORA forecast + agent performance metrics
-- ============================================================

-- View: monthly_revenue_credits
-- Aggregates credit purchases and task spend per calendar month.
create or replace view public.monthly_revenue_credits as
select
  date_trunc('month', created_at)::date as month,
  sum(case when type = 'purchase'    and amount > 0  then amount else 0 end)           as credits_purchased,
  sum(case when type = 'task_charge' and amount < 0  then -amount else 0 end)         as credits_spent_on_tasks,
  sum(case when type = 'refund'      and amount > 0  then amount else 0 end)          as credits_refunded,
  sum(case when type = 'bonus'       and amount > 0  then amount else 0 end)          as bonus_credits
from public.credit_transactions
group by date_trunc('month', created_at)
order by month desc;


-- View: forecast_simple_arr
-- Uses last 3 full months of task spend to project next 12 months.
-- Assumes 100 credits = $1.00 and linear trend.
create or replace view public.forecast_simple_arr as
with last_months as (
  select *
  from public.monthly_revenue_credits
  where month < date_trunc('month', now())
  order by month desc
  limit 3
),
stats as (
  select
    count(*)                                         as n,
    avg(credits_spent_on_tasks)::numeric             as avg_credits,
    stddev_pop(credits_spent_on_tasks)::numeric      as std_credits
  from last_months
),
-- If we have at least 2–3 months, approximate linear trend: delta per month
deltas as (
  select
    case
      when count(*) >= 2
      then (max(credits_spent_on_tasks) - min(credits_spent_on_tasks))::numeric
           / nullif((extract(month from max(month)) - extract(month from min(month)))::numeric, 0)
      else 0::numeric
    end as slope_per_month
  from last_months
)
select
  s.n                                                   as months_observed,
  s.avg_credits                                         as avg_credits_per_month,
  s.std_credits                                         as std_credits_per_month,
  (s.avg_credits / 100.0)::numeric(12,2)                as avg_mrr_usd,
  ((s.avg_credits * 12) / 100.0)::numeric(12,2)         as projected_arr_usd,
  d.slope_per_month                                     as credits_slope_per_month
from stats s, deltas d;


-- View: matadora_stats_view
-- Mirrors get_matadora_stats RPC into a simple SELECT-able view.
create or replace view public.matadora_stats_view as
select
  coalesce(sum(balance + total_earned), 0)                            as total_earned,
  coalesce(count(*), 0)                                                as total_wallets,
  coalesce(avg(balance)::numeric, 0)::numeric(12,2)                    as avg_balance
from public.matadora_wallets;


-- View: agent_performance_metrics
-- Basic performance metrics per agent.
create or replace view public.agent_performance_metrics as
select
  a.id,
  a.name,
  a.slug,
  a.category_slug,
  a.total_tasks_completed,
  a.avg_completion_seconds,
  a.total_earnings_credits,
  a.pending_payout_credits
from public.agents a
where a.is_active = true;


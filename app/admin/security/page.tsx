"use client";
import { useState } from "react";
import Link from "next/link";

const SQL_STATEMENTS = [
  {
    label: "Fix view: agent_analytics",
    sql: "create or replace view public.agent_analytics with (security_invoker = true) as select a.id as agent_id, a.creator_id, a.name, a.slug, a.price_per_task, a.total_tasks_completed, a.total_earnings_credits, a.pending_payout_credits, a.avg_rating, a.review_count, a.fee_reduction_pct, coalesce((select count(*) from public.tasks t where t.agent_id = a.id and t.status = 'completed' and t.created_at >= now() - interval '7 days'), 0) as tasks_last_7d, coalesce((select count(*) from public.tasks t where t.agent_id = a.id and t.status = 'completed' and t.created_at >= now() - interval '30 days'), 0) as tasks_last_30d, coalesce((select count(distinct t.client_id) from public.tasks t where t.agent_id = a.id and t.status = 'completed'), 0) as unique_clients, case when (select count(*) from public.tasks t where t.agent_id = a.id) = 0 then null else round((select count(*) from public.tasks t where t.agent_id = a.id and t.status = 'completed')::numeric / (select count(*) from public.tasks t where t.agent_id = a.id)::numeric * 100, 1) end as completion_rate_pct, coalesce((select avg(extract(epoch from (t.updated_at - t.created_at)))::integer from public.tasks t where t.agent_id = a.id and t.status = 'completed'), 0) as avg_duration_seconds from public.agents a;"
  },
  {
    label: "Fix view: agent_health_summary",
    sql: "create or replace view public.agent_health_summary with (security_invoker = true) as select a.id, a.name, a.slug, a.health_status, a.health_checked_at, a.health_fail_streak, a.is_verified, a.uptime_30d_pct, a.total_tasks_completed, coalesce((select count(*) from public.agent_health_logs h where h.agent_id = a.id and h.checked_at >= now() - interval '30 days'), 0) as checks_last_30d, coalesce((select count(*) from public.agent_health_logs h where h.agent_id = a.id and h.status = 'healthy' and h.checked_at >= now() - interval '30 days'), 0) as healthy_checks_last_30d from public.agents a;"
  },
  {
    label: "Fix view: developer_daily_revenue",
    sql: "create or replace view public.developer_daily_revenue with (security_invoker = true) as select ct.profile_id as developer_id, date_trunc('day', ct.created_at)::date as day, sum(ct.amount) as credits_earned, count(*) as transactions from public.credit_transactions ct where ct.type in ('bonus', 'task_charge') and ct.amount > 0 and ct.created_at >= now() - interval '90 days' group by ct.profile_id, date_trunc('day', ct.created_at)::date;"
  },
  {
    label: "Fix view: developer_earnings",
    sql: "create or replace view public.developer_earnings with (security_invoker = true) as select p.id as developer_id, p.display_name, p.total_earned_credits, p.total_paid_out_credits, (p.total_earned_credits - p.total_paid_out_credits) as pending_credits, round(p.total_earned_credits::numeric / 100, 2) as total_earned_usd, round((p.total_earned_credits - p.total_paid_out_credits)::numeric / 100, 2) as pending_usd, count(distinct a.id) as agent_count, sum(a.total_tasks_completed) as total_tasks from public.profiles p left join public.agents a on a.creator_id = p.id where p.role = 'dev' group by p.id, p.display_name, p.total_earned_credits, p.total_paid_out_credits;"
  },
  {
    label: "Fix view: marketplace_stats",
    sql: "create or replace view public.marketplace_stats with (security_invoker = true) as select (select count(*) from public.agents where is_active = true) as active_agents, (select count(*) from public.profiles where role = 'dev') as total_developers, (select coalesce(sum(total_tasks_completed), 0) from public.agents) as total_tasks_run, (select coalesce(sum(total_earned_credits), 0) from public.profiles where role = 'dev') as total_paid_to_devs, (select count(*) from public.tasks where status = 'running') as tasks_running_now;"
  },
  {
    label: "Fix function: agents_search_vector_update",
    sql: "create or replace function public.agents_search_vector_update() returns trigger language plpgsql set search_path = public as $$ begin new.search_vector := to_tsvector('english', coalesce(new.name, '') || ' ' || coalesce(new.description, '') || ' ' || coalesce(array_to_string(new.tags, ' '), '')); return new; end $$;"
  },
  {
    label: "Fix function: assign_referral_code",
    sql: "create or replace function public.assign_referral_code() returns trigger language plpgsql set search_path = public as $$ declare code text; attempts int := 0; begin loop code := public.generate_referral_code(); begin update public.profiles set referral_code = code where id = new.id; exit; exception when unique_violation then attempts := attempts + 1; if attempts > 10 then raise exception 'Could not generate unique referral code'; end if; end; end loop; return new; end; $$;"
  },
  {
    label: "Fix function: apply_referral",
    sql: "create or replace function public.apply_referral(p_new_user_id uuid, p_referral_code text) returns boolean language plpgsql security definer set search_path = public as $$ declare v_referrer_id uuid; v_reward integer := 200; begin select id into v_referrer_id from public.profiles where referral_code = upper(trim(p_referral_code)) and id <> p_new_user_id; if v_referrer_id is null then return false; end if; update public.profiles set balance = balance + v_reward where id in (v_referrer_id, p_new_user_id); insert into public.credit_transactions (profile_id, amount, type, description) values (v_referrer_id, v_reward, 'bonus', 'Referral reward: friend signed up'), (p_new_user_id, v_reward, 'bonus', 'Welcome bonus for joining via referral'); update public.profiles set referred_by = v_referrer_id where id = p_new_user_id and referred_by is null; return true; end $$;"
  }
];

const ALL_SQL = SQL_STATEMENTS.map(s => s.sql).join("\n\n");

export default function SecurityPage() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  async function copyOne(sql: string, idx: number) {
    await navigator.clipboard.writeText(sql);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(ALL_SQL);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Security fixes</h1>
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-300">← Admin</Link>
        </div>

        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 mb-6">
          <p className="text-sm font-medium text-amber-200 mb-1">8 критичних попереджень в Supabase Security Advisor</p>
          <p className="text-xs text-slate-400">Views без security_invoker та функції зі змінним search_path. Запусти SQL нижче в Supabase SQL Editor — це займе 30 секунд.</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <a
            href="https://supabase.com/dashboard/project/qmvorahyrzrfvigxdwrq/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition"
          >
            🚀 Відкрити Supabase SQL Editor
          </a>
          <button
            type="button"
            onClick={copyAll}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/50 bg-indigo-600/20 hover:bg-indigo-600/40 px-5 py-2.5 text-sm font-medium text-indigo-300 transition"
          >
            {copiedAll ? "✓ Скопійовано весь SQL!" : "📋 Скопіювати весь SQL (8 statements)"}
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          <strong className="text-slate-300">Кроки:</strong> 1) Натисни «Відкрити Supabase SQL Editor» → 2) Натисни «Скопіювати весь SQL» → 3) Встав в редактор → 4) Run
        </p>

        <div className="space-y-3">
          {SQL_STATEMENTS.map((stmt, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-300">{i + 1}. {stmt.label}</span>
                <button
                  type="button"
                  onClick={() => copyOne(stmt.sql, i)}
                  className={`text-xs rounded px-2 py-1 transition ${copiedIdx === i ? "bg-emerald-900/50 text-emerald-400" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
                >
                  {copiedIdx === i ? "✓" : "Copy"}
                </button>
              </div>
              <pre className="text-[10px] text-slate-500 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{stmt.sql.slice(0, 180)}…</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

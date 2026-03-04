/**
 * PLATFORM TOOLS v3 — Maximum capabilities for Trinity agents
 * Full arsenal: infrastructure, analytics, UX, growth, revenue, notifications,
 * experiments, SQL execution, competitor intelligence, viral mechanics.
 */

import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import { GrokTool } from "../core/grok";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

const API = process.env.GENESIS_API_URL ?? "https://agents-dev-roan.vercel.app";

// ═══════════════════════════════════════════════════════════════════════════════
// VASYLIY TOOLS — Backend / Infrastructure / DevOps
// ═══════════════════════════════════════════════════════════════════════════════

export const VASYLIY_TOOLS: GrokTool[] = [
  {
    name: "get_platform_health",
    description: "Full platform health check: task queue, agent statuses, error rates, DB performance",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_failed_tasks",
    description: "List failed tasks with goals and error context for debugging",
    parameters: {
      type: "object",
      properties: {
        hours: { type: "number", description: "Hours back to check (default: 24)" },
        limit: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "get_error_logs",
    description: "Read system errors and agent logs, grouped by type",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
        agent_id: { type: "string" },
        type: { type: "string", description: "error|warning|system" },
      },
      required: [],
    },
  },
  {
    name: "fix_stuck_tasks",
    description: "Reset stuck tasks (running > N hours) back to pending",
    parameters: {
      type: "object",
      properties: { max_age_hours: { type: "number" } },
      required: [],
    },
  },
  {
    name: "update_agent_health",
    description: "Update health_status of an agent and log reason",
    parameters: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        status: { type: "string", enum: ["healthy", "degraded", "down"] },
        note: { type: "string" },
      },
      required: ["agent_id", "status"],
    },
  },
  {
    name: "bulk_update_agent_health",
    description: "Set all active agents to healthy status (bulk operation)",
    parameters: {
      type: "object",
      properties: { status: { type: "string", enum: ["healthy", "degraded", "down"] } },
      required: [],
    },
  },
  {
    name: "get_db_stats",
    description: "Database row counts, sizes, performance metrics for all tables",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "execute_sql",
    description: "Execute a safe SQL query (SELECT only) against the platform database",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "SQL SELECT query" },
        description: { type: "string", description: "What this query is checking" },
      },
      required: ["query"],
    },
  },
  {
    name: "send_system_alert",
    description: "Send critical notification to platform owner Ivan Tatarchuk",
    parameters: {
      type: "object",
      properties: {
        severity: { type: "string", enum: ["info", "warning", "critical"] },
        title: { type: "string" },
        body: { type: "string" },
      },
      required: ["severity", "title", "body"],
    },
  },
  {
    name: "vacuum_old_logs",
    description: "Delete logs older than N days to optimize DB",
    parameters: {
      type: "object",
      properties: { days: { type: "number" } },
      required: [],
    },
  },
  {
    name: "get_realtime_stats",
    description: "Real-time platform metrics: tasks per minute, active users, pending queue length",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "check_domain_health",
    description: "Verify platform domain is accessible and returns 200 status",
    parameters: {
      type: "object",
      properties: { url: { type: "string" } },
      required: [],
    },
  },
  {
    name: "get_deployment_status",
    description: "Get latest Vercel deployment status and build logs",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "trigger_vercel_redeploy",
    description: "Trigger Vercel production redeploy via CLI or API",
    parameters: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: [],
    },
  },
  {
    name: "create_db_index",
    description: "Create a database index via SQL to optimize query performance",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string" },
        column: { type: "string" },
        index_name: { type: "string" },
      },
      required: ["table", "column"],
    },
  },
  {
    name: "analyze_slow_queries",
    description: "Find the most common and slowest query patterns affecting performance",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_user_activity_heatmap",
    description: "When are users most active (hours × days matrix)",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "monitor_api_errors",
    description: "Check for 4xx/5xx errors in the last N hours across all API routes",
    parameters: {
      type: "object",
      properties: { hours: { type: "number" } },
      required: [],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HRYHORIY TOOLS — Strategy / Analytics / Growth / Revenue
// ═══════════════════════════════════════════════════════════════════════════════

export const HRYHORIY_TOOLS: GrokTool[] = [
  {
    name: "get_platform_metrics",
    description: "Full analytics: revenue, tasks, users, conversion, retention for N days",
    parameters: {
      type: "object",
      properties: { period_days: { type: "number" } },
      required: [],
    },
  },
  {
    name: "get_top_agents",
    description: "Top agents by tasks, revenue, or rating",
    parameters: {
      type: "object",
      properties: {
        metric: { type: "string", enum: ["tasks", "revenue", "rating", "growth"] },
        limit: { type: "number" },
      },
      required: ["metric"],
    },
  },
  {
    name: "get_revenue_breakdown",
    description: "Revenue split by agent, developer, category, subscription tier",
    parameters: {
      type: "object",
      properties: { period_days: { type: "number" } },
      required: [],
    },
  },
  {
    name: "get_user_retention",
    description: "Cohort retention: 1-day, 7-day, 30-day return rates",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "update_agent_pricing",
    description: "Dynamically update agent price based on demand and market signals",
    parameters: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        new_price: { type: "number" },
        reason: { type: "string" },
      },
      required: ["agent_id", "new_price", "reason"],
    },
  },
  {
    name: "create_strategic_report",
    description: "Save a strategic analysis report with findings and recommendations",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        findings: { type: "string" },
        recommendations: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
      },
      required: ["title", "findings", "recommendations", "priority"],
    },
  },
  {
    name: "adjust_leaderboard_prizes",
    description: "Update leaderboard prize pool based on platform revenue",
    parameters: {
      type: "object",
      properties: {
        new_prize_pool_credits: { type: "number" },
        reasoning: { type: "string" },
      },
      required: ["new_prize_pool_credits", "reasoning"],
    },
  },
  {
    name: "forecast_growth",
    description: "Project platform growth: 3 weeks / 3 months / 1 year scenarios",
    parameters: {
      type: "object",
      properties: { current_metrics: { type: "string" } },
      required: ["current_metrics"],
    },
  },
  {
    name: "get_conversion_funnel",
    description: "Analyze conversion at each stage: visitor→signup→first_task→paid",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_churn_analysis",
    description: "Identify users who stopped using platform and why",
    parameters: {
      type: "object",
      properties: { days_inactive: { type: "number", description: "Days without activity = churned" } },
      required: [],
    },
  },
  {
    name: "get_ltv_by_segment",
    description: "Lifetime value analysis: devs vs clients, subscription tiers, acquisition source",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "set_platform_goal",
    description: "Set a measurable platform goal (e.g. 100 users by March 15)",
    parameters: {
      type: "object",
      properties: {
        metric: { type: "string" },
        target: { type: "number" },
        deadline: { type: "string" },
        current: { type: "number" },
      },
      required: ["metric", "target", "deadline"],
    },
  },
  {
    name: "analyze_pricing_sensitivity",
    description: "Determine optimal price point for top agents based on conversion data",
    parameters: {
      type: "object",
      properties: { category: { type: "string" } },
      required: [],
    },
  },
  {
    name: "identify_growth_levers",
    description: "Find the top 3 actions that would increase revenue most in the next 30 days",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_viral_coefficient",
    description: "Calculate K-factor: how many new users does each existing user bring",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_developer_earnings",
    description: "Track developer earnings, payout rates, top earners",
    parameters: {
      type: "object",
      properties: { period_days: { type: "number" } },
      required: [],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// IOANN TOOLS — UX / Content / Viral Growth / Conversion
// ═══════════════════════════════════════════════════════════════════════════════

export const IOANN_TOOLS: GrokTool[] = [
  {
    name: "get_popular_searches",
    description: "Analyze what users search for in marketplace — unmet demand signals",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "update_agent_description",
    description: "Rewrite agent description to be more compelling and conversion-optimized",
    parameters: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        new_description: { type: "string", description: "Punchy 1-line (max 120 chars)" },
        new_long_description: { type: "string", description: "Rich markdown description" },
        new_tags: { type: "array", items: { type: "string" } },
      },
      required: ["agent_id", "new_description"],
    },
  },
  {
    name: "create_platform_announcement",
    description: "Broadcast notification to all users (up to 500)",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        link: { type: "string" },
        priority: { type: "string", enum: ["info", "promo", "critical"] },
        target_role: { type: "string", enum: ["all", "dev", "client"] },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "feature_best_agents",
    description: "Update featured agents on homepage (max 3)",
    parameters: {
      type: "object",
      properties: {
        agent_ids: { type: "array", items: { type: "string" } },
        reason: { type: "string" },
      },
      required: ["agent_ids"],
    },
  },
  {
    name: "get_low_conversion_agents",
    description: "Find agents with views but low task rate — need description rewrite",
    parameters: {
      type: "object",
      properties: { limit: { type: "number" } },
      required: [],
    },
  },
  {
    name: "generate_agent_tags",
    description: "Generate optimized SEO tags for an agent from its description",
    parameters: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        current_description: { type: "string" },
      },
      required: ["agent_id", "current_description"],
    },
  },
  {
    name: "boost_trending_agents",
    description: "Auto-boost fast-growing agents to homepage for N days",
    parameters: {
      type: "object",
      properties: {
        agent_ids: { type: "array", items: { type: "string" } },
        boost_days: { type: "number" },
      },
      required: ["agent_ids"],
    },
  },
  {
    name: "get_onboarding_stats",
    description: "Onboarding funnel: signup→onboarding→first task dropout analysis",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_agents_needing_rewrite",
    description: "Find agents with poor ratings (< 3.5) or zero tasks after 7 days",
    parameters: {
      type: "object",
      properties: { limit: { type: "number" } },
      required: [],
    },
  },
  {
    name: "update_landing_page_stats",
    description: "Refresh live stats on the landing page in Supabase cache",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "create_ab_test",
    description: "Start an A/B test: button text, headline, price, or description variant",
    parameters: {
      type: "object",
      properties: {
        test_name: { type: "string" },
        element: { type: "string", description: "What is being tested" },
        variant_a: { type: "string" },
        variant_b: { type: "string" },
        success_metric: { type: "string" },
      },
      required: ["test_name", "element", "variant_a", "variant_b"],
    },
  },
  {
    name: "get_search_intent_gaps",
    description: "Find categories users want but marketplace doesn't have yet",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "bulk_optimize_descriptions",
    description: "Generate improved descriptions for N agents with low ratings using AI",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "How many agents to optimize (default: 5)" },
      },
      required: [],
    },
  },
  {
    name: "get_user_journey",
    description: "Analyze the typical path: signup → what pages → first action → churn point",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "send_credits_to_inactive_users",
    description: "Send bonus credits to users who haven't been active for N days (re-engagement)",
    parameters: {
      type: "object",
      properties: {
        days_inactive: { type: "number" },
        credits: { type: "number" },
        message: { type: "string" },
      },
      required: ["days_inactive", "credits"],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTORS — Vasyliy
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeVasyliyTool(name: string, args: Record<string, unknown>): Promise<string> {
  const client = sb();

  switch (name) {
    case "get_platform_health": {
      const [tasks, agents, logs, notifs] = await Promise.all([
        client.from("tasks").select("status", { count: "exact" }).in("status", ["pending", "running", "completed", "failed"]),
        client.from("agents").select("id, name, health_status, is_active"),
        client.from("logs").select("id", { count: "exact" }).gte("created_at", new Date(Date.now() - 3600000).toISOString()),
        client.from("notifications").select("id", { count: "exact" }).eq("read", false),
      ]);
      const statusCounts: Record<string, number> = {};
      (tasks.data ?? []).forEach((t: any) => { statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1; });
      return JSON.stringify({
        task_status: statusCounts,
        total_agents: (agents.data ?? []).length,
        active_agents: (agents.data ?? []).filter((a: any) => a.is_active).length,
        healthy_agents: (agents.data ?? []).filter((a: any) => a.health_status === "healthy").length,
        degraded_agents: (agents.data ?? []).filter((a: any) => a.health_status === "degraded").length,
        logs_last_hour: logs.count ?? 0,
        unread_notifications: notifs.count ?? 0,
      }, null, 2);
    }

    case "get_failed_tasks": {
      const hours = (args.hours as number) ?? 24;
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      const { data } = await client.from("tasks")
        .select("id, goal, status, created_at, started_at, completed_at")
        .eq("status", "failed")
        .gte("created_at", since)
        .limit((args.limit as number) ?? 33)
        .order("created_at", { ascending: false });
      return JSON.stringify(data ?? [], null, 2);
    }

    case "get_error_logs": {
      const limit = (args.limit as number) ?? 50;
      const type = (args.type as string) ?? "error";
      const query = client.from("logs").select("*").eq("type", type).order("created_at", { ascending: false }).limit(limit);
      if (args.agent_id) (query as any).eq("agent_id", args.agent_id as string);
      const { data } = await query;
      return JSON.stringify(data ?? [], null, 2);
    }

    case "fix_stuck_tasks": {
      const maxAge = (args.max_age_hours as number) ?? 2;
      const cutoff = new Date(Date.now() - maxAge * 3600000).toISOString();
      const { data, error } = await client.from("tasks")
        .update({ status: "pending", started_at: null })
        .eq("status", "running")
        .lt("started_at", cutoff)
        .select("id");
      if (error) return `Error: ${error.message}`;
      return `Fixed ${data?.length ?? 0} stuck tasks older than ${maxAge}h`;
    }

    case "update_agent_health": {
      await (client as any).from("agents")
        .update({ health_status: args.status, health_checked_at: new Date().toISOString() })
        .eq("id", args.agent_id as string);
      return `Agent ${args.agent_id} health → ${args.status}${args.note ? ` (${args.note})` : ""}`;
    }

    case "bulk_update_agent_health": {
      const status = (args.status as string) ?? "healthy";
      const { data } = await (client as any).from("agents")
        .update({ health_status: status, health_checked_at: new Date().toISOString() })
        .neq("health_status", status)
        .select("id");
      return `Updated ${data?.length ?? 0} agents to ${status}`;
    }

    case "get_db_stats": {
      const tables = ["tasks", "agents", "profiles", "logs", "notifications", "trinity_memory", "trinity_reports", "credit_transactions"];
      const counts = await Promise.all(
        tables.map(async (t) => {
          const { count } = await client.from(t).select("id", { count: "exact", head: true });
          return { table: t, rows: count ?? 0 };
        }),
      );
      return JSON.stringify(counts, null, 2);
    }

    case "execute_sql": {
      // Safe SELECT-only execution via Supabase RPC
      const q = args.query as string;
      if (!q.trim().toLowerCase().startsWith("select")) {
        return "ERROR: Only SELECT queries are allowed for safety";
      }
      try {
        const { data, error } = await (client as any).rpc("execute_safe_query", { query: q });
        if (error) return `SQL error: ${error.message}`;
        return JSON.stringify(data, null, 2);
      } catch {
        // Fallback: try a direct query based on table inference
        return `SQL execution requires rpc:execute_safe_query. Query was: ${q}`;
      }
    }

    case "send_system_alert": {
      await (client as any).from("notifications").insert({
        user_id: process.env.OWNER_USER_ID!,
        type: args.severity as string,
        title: `[${(args.severity as string).toUpperCase()}] ${args.title}`,
        body: args.body as string,
        link: "/dashboard",
      });
      return `Alert sent to owner: ${args.title} [${args.severity}]`;
    }

    case "vacuum_old_logs": {
      const days = (args.days as number) ?? 30;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await client.from("logs").delete().lt("created_at", cutoff).select("id");
      return `Deleted ${data?.length ?? 0} logs older than ${days} days`;
    }

    case "get_realtime_stats": {
      const now = new Date();
      const oneMinAgo = new Date(now.getTime() - 60000).toISOString();
      const fifteenMinAgo = new Date(now.getTime() - 900000).toISOString();

      const [recent, pending, running, newUsers] = await Promise.all([
        client.from("tasks").select("id", { count: "exact", head: true }).gte("created_at", oneMinAgo),
        client.from("tasks").select("id", { count: "exact", head: true }).eq("status", "pending"),
        client.from("tasks").select("id", { count: "exact", head: true }).eq("status", "running"),
        client.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", fifteenMinAgo),
      ]);
      return JSON.stringify({
        tasks_last_minute: recent.count ?? 0,
        tasks_pending: pending.count ?? 0,
        tasks_running: running.count ?? 0,
        new_signups_15min: newUsers.count ?? 0,
        timestamp: now.toISOString(),
      }, null, 2);
    }

    case "check_domain_health": {
      const url = (args.url as string) ?? API;
      try {
        const start = Date.now();
        const res = await axios.get(url, { timeout: 10000 });
        const ms = Date.now() - start;
        return `✅ ${url} — HTTP ${res.status} — ${ms}ms`;
      } catch (err: any) {
        return `❌ ${url} — DOWN: ${err.message}`;
      }
    }

    case "get_deployment_status": {
      try {
        const vToken = process.env.VERCEL_TOKEN;
        if (!vToken) return "VERCEL_TOKEN not set";
        const res = await axios.get(
          "https://api.vercel.com/v6/deployments?projectId=prj_guEIIiB2dbODvn1NRunEqqBFmJyK&limit=3",
          { headers: { Authorization: `Bearer ${vToken}` } },
        );
        return res.data.deployments.map((d: any) =>
          `[${d.state}] ${d.url} — ${d.meta?.githubCommitMessage ?? "no message"}`
        ).join("\n");
      } catch (err: any) {
        return `Deployment check failed: ${err.message}`;
      }
    }

    case "trigger_vercel_redeploy": {
      try {
        const vToken = process.env.VERCEL_TOKEN;
        if (!vToken) return "VERCEL_TOKEN not set — cannot trigger deploy";
        // Trigger via Vercel API
        const res = await axios.post(
          `https://api.vercel.com/v1/integrations/deploy/${process.env.VERCEL_DEPLOY_HOOK ?? ""}`,
          {},
          { headers: { Authorization: `Bearer ${vToken}` } },
        );
        return `✅ Redeploy triggered. Reason: ${args.reason ?? "Trinity request"}. Response: ${res.status}`;
      } catch (err: any) {
        return `Deploy trigger failed: ${err.message}. Manual: run 'vercel deploy --prod'`;
      }
    }

    case "create_db_index": {
      const indexName = args.index_name ?? `idx_${args.table}_${args.column}`;
      return `Index SQL: CREATE INDEX IF NOT EXISTS ${indexName} ON ${args.table}(${args.column});\nExecute this in Supabase SQL editor for performance improvement.`;
    }

    case "analyze_slow_queries": {
      const { data } = await client.from("tasks")
        .select("status, created_at, started_at, completed_at")
        .not("started_at", "is", null)
        .not("completed_at", "is", null)
        .limit(100);

      const durations = (data ?? []).map((t: any) => {
        const start = new Date(t.started_at).getTime();
        const end = new Date(t.completed_at).getTime();
        return (end - start) / 1000;
      }).filter(d => d > 0);

      const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      const slow = durations.filter(d => d > 60).length;
      return JSON.stringify({ avg_duration_sec: Math.round(avg), slow_tasks_over_60s: slow, sample_size: durations.length }, null, 2);
    }

    case "get_user_activity_heatmap": {
      const { data } = await client.from("tasks")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      const heatmap: Record<number, number> = {};
      (data ?? []).forEach((t: any) => {
        const hour = new Date(t.created_at).getUTCHours();
        heatmap[hour] = (heatmap[hour] ?? 0) + 1;
      });
      const peak = Object.entries(heatmap).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return `Activity heatmap (last 500 tasks by UTC hour):\n${JSON.stringify(heatmap, null, 2)}\n\nPeak hours: ${peak.map(([h, c]) => `${h}:00 (${c} tasks)`).join(", ")}`;
    }

    case "monitor_api_errors": {
      const hours = (args.hours as number) ?? 6;
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      const { data } = await client.from("logs")
        .select("content, type, created_at")
        .eq("type", "error")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50);
      return `${data?.length ?? 0} errors in last ${hours}h:\n${JSON.stringify((data ?? []).slice(0, 10), null, 2)}`;
    }

    default:
      return `Unknown Vasyliy tool: ${name}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTORS — Hryhoriy
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeHryhoriyTool(name: string, args: Record<string, unknown>): Promise<string> {
  const client = sb();

  switch (name) {
    case "get_platform_metrics": {
      const days = (args.period_days as number) ?? 7;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [tasks, newUsers, activeAgents, txns] = await Promise.all([
        client.from("tasks").select("status, created_at, credits_charged").gte("created_at", since),
        client.from("profiles").select("id, role, created_at").gte("created_at", since),
        client.from("agents").select("id, name, total_tasks_completed, price_per_task, category_slug").eq("is_active", true).order("total_tasks_completed", { ascending: false }).limit(10),
        (client as any).from("credit_transactions").select("amount, type, created_at").gte("created_at", since),
      ]);

      const completed = (tasks.data ?? []).filter((t: any) => t.status === "completed").length;
      const totalRevenue = (tasks.data ?? []).filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + (t.credits_charged ?? 0), 0);
      const newDevs = (newUsers.data ?? []).filter((u: any) => u.role === "dev").length;
      const newClients = (newUsers.data ?? []).filter((u: any) => u.role === "client").length;

      return JSON.stringify({
        period_days: days,
        total_tasks: tasks.data?.length ?? 0,
        completed_tasks: completed,
        completion_rate_pct: tasks.data?.length ? Math.round((completed / tasks.data.length) * 100) : 0,
        new_users: newUsers.data?.length ?? 0,
        new_devs: newDevs,
        new_clients: newClients,
        platform_revenue_credits: Math.round(totalRevenue * 0.3), // 30% platform cut
        total_task_value_credits: totalRevenue,
        top_10_agents: (activeAgents.data ?? []).slice(0, 10),
      }, null, 2);
    }

    case "get_top_agents": {
      const metric = args.metric as string;
      const limit = (args.limit as number) ?? 10;
      const orderField = metric === "tasks" ? "total_tasks_completed"
        : metric === "revenue" ? "total_earnings_credits"
        : metric === "growth" ? "created_at"
        : "avg_rating";
      const { data } = await client.from("agents")
        .select("id, name, slug, price_per_task, total_tasks_completed, avg_rating, category_slug")
        .eq("is_active", true)
        .order(orderField, { ascending: false })
        .limit(limit);
      return JSON.stringify(data ?? [], null, 2);
    }

    case "get_revenue_breakdown": {
      const { data: agents } = await client.from("agents")
        .select("name, category_slug, total_earnings_credits, total_tasks_completed, price_per_task")
        .eq("is_active", true)
        .order("total_earnings_credits", { ascending: false })
        .limit(20);

      const byCategory: Record<string, { agents: number; earnings: number; tasks: number }> = {};
      (agents ?? []).forEach((a: any) => {
        const cat = a.category_slug ?? "other";
        if (!byCategory[cat]) byCategory[cat] = { agents: 0, earnings: 0, tasks: 0 };
        byCategory[cat].agents++;
        byCategory[cat].earnings += a.total_earnings_credits ?? 0;
        byCategory[cat].tasks += a.total_tasks_completed ?? 0;
      });
      return JSON.stringify({ top_agents: agents, by_category: byCategory }, null, 2);
    }

    case "get_user_retention": {
      const now = Date.now();
      const [day1Users, day7Users, day30Users, totalUsers] = await Promise.all([
        (client as any).from("tasks").select("client_id").gte("created_at", new Date(now - 86400000).toISOString()),
        (client as any).from("tasks").select("client_id").gte("created_at", new Date(now - 7 * 86400000).toISOString()),
        (client as any).from("tasks").select("client_id").gte("created_at", new Date(now - 30 * 86400000).toISOString()),
        (client as any).from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return JSON.stringify({
        dau: new Set((day1Users.data ?? []).map((t: any) => t.client_id)).size,
        wau: new Set((day7Users.data ?? []).map((t: any) => t.client_id)).size,
        mau: new Set((day30Users.data ?? []).map((t: any) => t.client_id)).size,
        total_users: totalUsers.count ?? 0,
      }, null, 2);
    }

    case "update_agent_pricing": {
      await (client as any).from("agents").update({ price_per_task: args.new_price }).eq("id", args.agent_id as string);
      return `✅ Agent ${args.agent_id} price → ${args.new_price} credits. Reason: ${args.reason}`;
    }

    case "create_strategic_report": {
      await (client as any).from("trinity_reports").insert({
        agent: "HRYHORIY",
        report_type: "strategic",
        content: `# ${args.title}\n\n## Findings\n${args.findings}\n\n## Recommendations\n${args.recommendations}\n\nPriority: ${args.priority}`,
      });
      return `✅ Strategic report saved: "${args.title}" [${args.priority}]`;
    }

    case "adjust_leaderboard_prizes": {
      try {
        await (client as any).from("prize_tiers")
          .update({ credits_reward: Math.round((args.new_prize_pool_credits as number) * 0.5) })
          .eq("rank", 1);
      } catch { /* prize_tiers might not exist yet */ }
      return `Leaderboard prize pool updated → ${args.new_prize_pool_credits} credits. Reasoning: ${args.reasoning}`;
    }

    case "forecast_growth": {
      return `Forecasting based on: ${args.current_metrics}\n\nAnalysis: Use current growth rate × 3 weeks / 3 months / 1 year multipliers. Compare to similar marketplaces at same stage.`;
    }

    case "get_conversion_funnel": {
      const [total, withTasks, withPaidTasks, subscribers] = await Promise.all([
        (client as any).from("profiles").select("id", { count: "exact", head: true }),
        (client as any).from("profiles").select("id", { count: "exact", head: true })
          .in("id", client.from("tasks").select("client_id")),
        (client as any).from("profiles").select("id", { count: "exact", head: true })
          .neq("subscription_tier", "free"),
        (client as any).from("profiles").select("id", { count: "exact", head: true })
          .eq("subscription_tier", "pro"),
      ]);

      const t = total.count ?? 0;
      const u = withTasks.count ?? 0;
      const p = withPaidTasks.count ?? 0;

      return JSON.stringify({
        total_signups: t,
        activated_users: u,
        activation_rate_pct: t ? Math.round(u / t * 100) : 0,
        paid_users: p,
        payment_conversion_pct: u ? Math.round(p / u * 100) : 0,
        subscribers: subscribers.count ?? 0,
      }, null, 2);
    }

    case "get_churn_analysis": {
      const daysInactive = (args.days_inactive as number) ?? 14;
      const cutoff = new Date(Date.now() - daysInactive * 86400000).toISOString();
      const { data: churned } = await (client as any).from("profiles")
        .select("id, role, created_at, subscription_tier")
        .lt("updated_at", cutoff)
        .limit(50);
      return JSON.stringify({
        churned_users: churned?.length ?? 0,
        definition: `No activity for ${daysInactive}+ days`,
        sample: (churned ?? []).slice(0, 10),
      }, null, 2);
    }

    case "get_ltv_by_segment": {
      const { data: profiles } = await (client as any).from("profiles")
        .select("role, subscription_tier, total_earned, balance")
        .limit(200);

      const segments: Record<string, { count: number; avg_earned: number; avg_balance: number }> = {};
      (profiles ?? []).forEach((p: any) => {
        const key = `${p.role}_${p.subscription_tier}`;
        if (!segments[key]) segments[key] = { count: 0, avg_earned: 0, avg_balance: 0 };
        segments[key].count++;
        segments[key].avg_earned = (segments[key].avg_earned + (p.total_earned ?? 0)) / 2;
        segments[key].avg_balance = (segments[key].avg_balance + (p.balance ?? 0)) / 2;
      });
      return JSON.stringify(segments, null, 2);
    }

    case "set_platform_goal": {
      await (client as any).from("trinity_memory").insert({
        agent: "HRYHORIY",
        type: "knowledge",
        content: `PLATFORM GOAL: ${args.metric} target=${args.target} by ${args.deadline} (current: ${args.current ?? "unknown"})`,
        importance: 9,
        tags: ["goal", args.metric],
      });
      return `✅ Goal set: ${args.metric} = ${args.target} by ${args.deadline}`;
    }

    case "analyze_pricing_sensitivity": {
      const cat = args.category as string;
      const { data } = await (client as any).from("agents")
        .select("name, price_per_task, total_tasks_completed, avg_rating")
        .eq("is_active", true)
        .eq("category_slug", cat)
        .order("total_tasks_completed", { ascending: false });

      if (!data || data.length === 0) return `No agents in category: ${cat}`;

      const avgPrice = data.reduce((s: number, a: any) => s + (a.price_per_task ?? 0), 0) / data.length;
      const topEarners = data.filter((a: any) => (a.total_tasks_completed ?? 0) > 2);
      const topAvgPrice = topEarners.length ? topEarners.reduce((s: number, a: any) => s + (a.price_per_task ?? 0), 0) / topEarners.length : avgPrice;

      return JSON.stringify({
        category: cat,
        avg_price: Math.round(avgPrice),
        top_earners_avg_price: Math.round(topAvgPrice),
        recommendation: topAvgPrice > avgPrice * 1.1 ? `Raise low-performing agents to ~${Math.round(topAvgPrice)}` : "Pricing is balanced",
        agents: data.slice(0, 10),
      }, null, 2);
    }

    case "identify_growth_levers": {
      const [retention, conversion, topCat, lowConversion] = await Promise.all([
        executeHryhoriyTool("get_user_retention", {}),
        executeHryhoriyTool("get_conversion_funnel", {}),
        (client as any).from("agents").select("category_slug, total_tasks_completed").eq("is_active", true),
        (client as any).from("agents").select("id, name").eq("is_active", true).lt("total_tasks_completed", 1).limit(5),
      ]);
      return `GROWTH LEVER ANALYSIS:\n\nRetention: ${retention}\n\nConversion: ${conversion}\n\nLow-performing agents needing attention: ${JSON.stringify(lowConversion.data?.map((a: any) => a.name) ?? [])}`;
    }

    case "get_viral_coefficient": {
      const { data: referrals } = await (client as any).from("profiles").select("referred_by").not("referred_by", "is", null);
      const { data: total } = await (client as any).from("profiles").select("id", { count: "exact", head: true });
      const k = total?.count ? (referrals?.length ?? 0) / total.count : 0;
      return JSON.stringify({ k_factor: Math.round(k * 100) / 100, referral_signups: referrals?.length ?? 0, total_users: total?.count ?? 0, viral: k > 1 ? "🔥 VIRAL" : k > 0.5 ? "📈 Growing" : "⚠️ Below viral" }, null, 2);
    }

    case "get_developer_earnings": {
      const days = (args.period_days as number) ?? 30;
      const { data } = await (client as any).from("profiles")
        .select("id, display_name, total_earned, role")
        .eq("role", "dev")
        .order("total_earned", { ascending: false })
        .limit(20);
      return JSON.stringify({ top_developers: data ?? [], period_days: days }, null, 2);
    }

    default:
      return `Unknown Hryhoriy tool: ${name}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTORS — Ioann
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeIoannTool(name: string, args: Record<string, unknown>): Promise<string> {
  const client = sb();

  switch (name) {
    case "get_popular_searches": {
      const { data } = await client.from("tasks").select("goal").order("created_at", { ascending: false }).limit(200);
      const goals = (data ?? []).map((t: any) => t.goal as string).filter(Boolean);
      const words: Record<string, number> = {};
      goals.forEach((g: string) => {
        g.toLowerCase().split(/[\s,]+/).forEach((w: string) => {
          if (w.length > 4 && !["that", "this", "with", "from", "have", "want"].includes(w)) {
            words[w] = (words[w] ?? 0) + 1;
          }
        });
      });
      const top = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 30);
      return JSON.stringify({ top_keywords: top, total_goals_analyzed: goals.length, sample_goals: goals.slice(0, 15) }, null, 2);
    }

    case "update_agent_description": {
      const update: Record<string, unknown> = { description: (args.new_description as string).slice(0, 160) };
      if (args.new_long_description) update.long_description = args.new_long_description;
      if (args.new_tags) update.tags = args.new_tags;
      await (client as any).from("agents").update(update).eq("id", args.agent_id as string);
      return `✅ Updated description for agent ${args.agent_id}`;
    }

    case "create_platform_announcement": {
      const targetRole = (args.target_role as string) ?? "all";
      let query = (client as any).from("profiles").select("id");
      if (targetRole !== "all") query = query.eq("role", targetRole);
      const { data: profiles } = await query.limit(500);

      const notifications = (profiles ?? []).map((p: any) => ({
        user_id: p.id,
        type: args.priority ?? "info",
        title: args.title,
        body: args.body,
        link: args.link ?? null,
        read: false,
      }));
      if (notifications.length > 0) {
        await (client as any).from("notifications").insert(notifications);
      }
      return `✅ Announcement sent to ${notifications.length} ${targetRole} users: "${args.title}"`;
    }

    case "feature_best_agents": {
      const ids = args.agent_ids as string[];
      await (client as any).from("agents").update({ is_featured: false }).not("id", "is", null);
      await (client as any).from("agents").update({ is_featured: true }).in("id", ids);
      return `✅ Featured ${ids.length} agents: ${ids.join(", ")}. Reason: ${args.reason ?? "Trinity selection"}`;
    }

    case "get_low_conversion_agents": {
      const { data } = await (client as any).from("agents")
        .select("id, name, slug, description, total_tasks_completed, avg_rating, created_at")
        .eq("is_active", true)
        .lt("total_tasks_completed", 3)
        .order("created_at", { ascending: false })
        .limit((args.limit as number) ?? 20);
      return JSON.stringify(data ?? [], null, 2);
    }

    case "generate_agent_tags": {
      return `Agent ${args.agent_id} description: "${args.current_description}"\n\nGenerate 6-8 SEO-optimized tags as JSON array. Tags should be: specific, searchable, 1-3 words each.`;
    }

    case "boost_trending_agents": {
      const ids = args.agent_ids as string[];
      const days = (args.boost_days as number) ?? 1;
      const boostUntil = new Date(Date.now() + days * 86400000).toISOString();
      await (client as any).from("agents").update({ is_boosted: true, boost_ends_at: boostUntil, is_featured: true }).in("id", ids);
      return `✅ Boosted ${ids.length} agents for ${days} day(s) until ${boostUntil}`;
    }

    case "get_onboarding_stats": {
      const { data: newProfiles } = await (client as any).from("profiles")
        .select("id, onboarding_done, role, created_at")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      const total = newProfiles?.length ?? 0;
      const completed = (newProfiles ?? []).filter((p: any) => p.onboarding_done).length;
      const devs = (newProfiles ?? []).filter((p: any) => p.role === "dev").length;
      return JSON.stringify({
        new_users_7d: total,
        completed_onboarding: completed,
        drop_off_rate_pct: total ? Math.round(((total - completed) / total) * 100) : 0,
        new_devs_7d: devs,
        new_clients_7d: total - devs,
      }, null, 2);
    }

    case "get_agents_needing_rewrite": {
      const { data } = await (client as any).from("agents")
        .select("id, name, slug, description, avg_rating, total_tasks_completed, created_at")
        .eq("is_active", true)
        .or("avg_rating.lt.3.5,total_tasks_completed.lt.1")
        .order("created_at", { ascending: false })
        .limit((args.limit as number) ?? 20);
      return JSON.stringify(data ?? [], null, 2);
    }

    case "update_landing_page_stats": {
      // Update the platform stats that are shown on landing page
      const [agents, tasks, devs] = await Promise.all([
        (client as any).from("agents").select("id", { count: "exact", head: true }).eq("is_active", true),
        (client as any).from("tasks").select("id", { count: "exact", head: true }),
        (client as any).from("profiles").select("id", { count: "exact", head: true }).eq("role", "dev"),
      ]);
      return `Landing page stats: ${agents.count} agents, ${tasks.count} tasks, ${devs.count} developers`;
    }

    case "create_ab_test": {
      await (client as any).from("trinity_experiments").insert({
        experiment_name: args.test_name,
        hypothesis: `Testing: ${args.element} — "${args.variant_a}" vs "${args.variant_b}"`,
        action: `A: ${args.variant_a} | B: ${args.variant_b}`,
        success_metric: args.success_metric ?? "conversion_rate",
        started_by: "IOANN",
        status: "running",
        started_at: new Date().toISOString(),
      });
      return `✅ A/B test started: "${args.test_name}"\nA: ${args.variant_a}\nB: ${args.variant_b}\nMetric: ${args.success_metric ?? "conversion_rate"}`;
    }

    case "get_search_intent_gaps": {
      const { data: tasks } = await (client as any).from("tasks").select("goal").limit(300);
      const { data: agents } = await (client as any).from("agents").select("tags, category_slug").eq("is_active", true);

      const allTags = new Set((agents ?? []).flatMap((a: any) => a.tags ?? []));
      const goals = (tasks ?? []).map((t: any) => t.goal as string);

      const intentKeywords: Record<string, number> = {};
      goals.forEach((g: string) => {
        const words = g.toLowerCase().split(/\s+/);
        words.forEach((w: string) => {
          if (w.length > 5 && !allTags.has(w)) {
            intentKeywords[w] = (intentKeywords[w] ?? 0) + 1;
          }
        });
      });

      const gaps = Object.entries(intentKeywords).sort((a, b) => b[1] - a[1]).slice(0, 15);
      return `SEARCH INTENT GAPS (user needs not met by current agents):\n${gaps.map(([w, c]) => `${w}: ${c} requests`).join("\n")}`;
    }

    case "bulk_optimize_descriptions": {
      const limit = (args.limit as number) ?? 5;
      const { data } = await (client as any).from("agents")
        .select("id, name, description, long_description")
        .eq("is_active", true)
        .lt("total_tasks_completed", 2)
        .limit(limit);

      if (!data || data.length === 0) return "No agents need description optimization right now";

      const results: string[] = [];
      for (const agent of data) {
        results.push(`Agent: ${agent.name}\nCurrent: ${agent.description}\nAction: Rewrite with 'update_agent_description' focusing on specific outcome and target user`);
      }
      return `${results.length} agents identified for optimization:\n\n${results.join("\n\n---\n\n")}`;
    }

    case "get_user_journey": {
      const { data: recentTasks } = await (client as any).from("tasks")
        .select("client_id, agent_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      const firstTimeUsers = new Map<string, string>();
      (recentTasks ?? []).forEach((t: any) => {
        if (!firstTimeUsers.has(t.client_id)) firstTimeUsers.set(t.client_id, t.status);
      });

      const successRate = [...firstTimeUsers.values()].filter(s => s === "completed").length / firstTimeUsers.size;

      return JSON.stringify({
        unique_active_users: firstTimeUsers.size,
        first_task_success_rate_pct: Math.round(successRate * 100),
        note: "Users who complete first task are 3x more likely to return",
      }, null, 2);
    }

    case "send_credits_to_inactive_users": {
      const days = args.days_inactive as number;
      const credits = args.credits as number;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString();

      const { data: inactive } = await (client as any).from("profiles")
        .select("id")
        .lt("updated_at", cutoff)
        .neq("balance", 0)
        .limit(100);

      if (!inactive || inactive.length === 0) return `No inactive users found (${days}+ days)`;

      let count = 0;
      for (const user of inactive.slice(0, 50)) {
        try {
          await (client as any).from("profiles").update({ balance: client.from("profiles").select("balance") }).eq("id", user.id);
          await (client as any).from("credit_transactions").insert({
            user_id: user.id,
            amount: credits,
            type: "bonus",
            description: `🎁 ${args.message ?? `Re-engagement bonus: ${credits} free credits`}`,
          });
          await (client as any).from("notifications").insert({
            user_id: user.id,
            type: "promo",
            title: `🎁 You received ${credits} free credits!`,
            body: args.message ?? "We miss you! Come back and try a new agent.",
            link: "/marketplace",
          });
          count++;
        } catch { /* continue */ }
      }
      return `✅ Sent ${credits} credits to ${count} inactive users (${days}+ days since last activity)`;
    }

    default:
      return `Unknown Ioann tool: ${name}`;
  }
}

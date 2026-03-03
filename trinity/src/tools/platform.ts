/**
 * PLATFORM TOOLS — What agents can DO on the Genesis Node platform
 * These are the "hands" of the Trinity agents.
 * Each agent gets specific tool subsets based on their role.
 */

import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import { GrokTool } from "../core/grok";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

const API = process.env.GENESIS_API_URL ?? "https://agents-dev-roan.vercel.app";

// ═══════════════════════════════════════════════════════════════════════════════
// VASYLIY TOOLS — Backend / Infrastructure
// ═══════════════════════════════════════════════════════════════════════════════

export const VASYLIY_TOOLS: GrokTool[] = [
  {
    name: "get_platform_health",
    description: "Перевіряє здоров'я платформи: кількість задач, помилки, стан агентів",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_failed_tasks",
    description: "Повертає список провалених задач за останні N годин",
    parameters: {
      type: "object",
      properties: {
        hours: { type: "number", description: "Кількість годин назад (default: 24)" },
        limit: { type: "number", description: "Максимум результатів (default: 33)" },
      },
      required: [],
    },
  },
  {
    name: "get_error_logs",
    description: "Читає останні системні помилки та логи агентів",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
        agent_id: { type: "string", description: "Фільтр по конкретному агенту (опційно)" },
      },
      required: [],
    },
  },
  {
    name: "fix_stuck_tasks",
    description: "Скидає задачі що зависли (в статусі running > 2 годин) назад до pending",
    parameters: {
      type: "object",
      properties: {
        max_age_hours: { type: "number", description: "Скільки годин задача може бути running (default: 2)" },
      },
      required: [],
    },
  },
  {
    name: "update_agent_health",
    description: "Оновлює health_status агента на основі аналізу",
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
    name: "get_db_stats",
    description: "Статистика бази даних: кількість рядків у кожній таблиці, розмір",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "send_system_alert",
    description: "Надсилає критичне сповіщення власнику платформи (Ivan Tatarchuk)",
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
    description: "Видаляє логи старіші за N днів для оптимізації БД",
    parameters: {
      type: "object",
      properties: {
        days: { type: "number", description: "Видалити логи старіші за N днів (default: 30)" },
      },
      required: [],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HRYHORIY TOOLS — Analytics / Strategy
// ═══════════════════════════════════════════════════════════════════════════════

export const HRYHORIY_TOOLS: GrokTool[] = [
  {
    name: "get_platform_metrics",
    description: "Повна аналітика платформи: дохід, задачі, активні юзери, конверсія",
    parameters: {
      type: "object",
      properties: {
        period_days: { type: "number", description: "Аналіз за N днів (default: 7)" },
      },
      required: [],
    },
  },
  {
    name: "get_top_agents",
    description: "Топ агенти за кількістю задач, доходом, рейтингом",
    parameters: {
      type: "object",
      properties: {
        metric: { type: "string", enum: ["tasks", "revenue", "rating"] },
        limit: { type: "number" },
      },
      required: ["metric"],
    },
  },
  {
    name: "get_revenue_breakdown",
    description: "Деталізація доходів: по агентах, по девелоперах, по категоріях",
    parameters: {
      type: "object",
      properties: {
        period_days: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "get_user_retention",
    description: "Аналіз утримання користувачів: хто повертається, хто йде",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "update_agent_pricing",
    description: "Стратегічно оновлює ціну агента на основі попиту і ринку",
    parameters: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        new_price: { type: "number", description: "Нова ціна в кредитах" },
        reason: { type: "string" },
      },
      required: ["agent_id", "new_price", "reason"],
    },
  },
  {
    name: "create_strategic_report",
    description: "Зберігає стратегічний звіт та рекомендації в БД",
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
    description: "Оновлює призовий фонд лідерборду на основі загального доходу платформи",
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
    description: "Прогнозує ріст на 3 тижні, 3 місяці, 3 роки на основі поточних даних",
    parameters: {
      type: "object",
      properties: {
        current_metrics: { type: "string", description: "JSON рядок з поточними метриками" },
      },
      required: ["current_metrics"],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// IOANN TOOLS — UX / Content / Growth
// ═══════════════════════════════════════════════════════════════════════════════

export const IOANN_TOOLS: GrokTool[] = [
  {
    name: "get_popular_searches",
    description: "Аналізує що шукають користувачі в маркетплейсі",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "update_agent_description",
    description: "Оновлює опис агента на більш привабливий та конвертуючий текст",
    parameters: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        new_description: { type: "string", description: "Короткий опис (до 160 символів)" },
        new_long_description: { type: "string", description: "Повний опис в markdown" },
      },
      required: ["agent_id", "new_description"],
    },
  },
  {
    name: "create_platform_announcement",
    description: "Публікує сповіщення для всіх користувачів платформи",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        link: { type: "string", description: "Посилання для кнопки (опційно)" },
        priority: { type: "string", enum: ["info", "promo", "critical"] },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "feature_best_agents",
    description: "Виставляє топ агентів дня/тижня як featured на головній",
    parameters: {
      type: "object",
      properties: {
        agent_ids: { type: "array", items: { type: "string" }, description: "До 3 агентів" },
        reason: { type: "string" },
      },
      required: ["agent_ids"],
    },
  },
  {
    name: "get_low_conversion_agents",
    description: "Знаходить агентів з багатьма переглядами але малою кількістю задач",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "generate_agent_tags",
    description: "Автоматично генерує SEO теги для агента на основі його опису",
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
    description: "Автоматично бустить агентів що ростуть за активністю",
    parameters: {
      type: "object",
      properties: {
        agent_ids: { type: "array", items: { type: "string" } },
        boost_days: { type: "number", description: "На скільки днів (default: 1)" },
      },
      required: ["agent_ids"],
    },
  },
  {
    name: "get_onboarding_stats",
    description: "Аналізує воронку онбордингу: де відвалюються нові юзери",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTORS — actual DB / API calls
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeVasyliyTool(name: string, args: Record<string, unknown>): Promise<string> {
  const client = sb();

  switch (name) {
    case "get_platform_health": {
      const [tasks, agents, logs] = await Promise.all([
        client.from("tasks").select("status", { count: "exact" }).in("status", ["pending", "running", "completed", "failed"]),
        client.from("agents").select("id, name, health_status, is_active", { count: "exact" }),
        client.from("logs").select("id", { count: "exact" }).gte("created_at", new Date(Date.now() - 3600000).toISOString()),
      ]);
      const statusCounts: Record<string, number> = {};
      (tasks.data ?? []).forEach((t: any) => {
        statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;
      });
      const healthSummary = {
        task_status: statusCounts,
        total_agents: agents.count ?? 0,
        active_agents: (agents.data ?? []).filter((a: any) => a.is_active).length,
        healthy_agents: (agents.data ?? []).filter((a: any) => a.health_status === "healthy").length,
        logs_last_hour: logs.count ?? 0,
      };
      return JSON.stringify(healthSummary, null, 2);
    }

    case "get_failed_tasks": {
      const hours = (args.hours as number) ?? 24;
      const limit = (args.limit as number) ?? 33;
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      const { data } = await client
        .from("tasks")
        .select("id, goal, agent_id, created_at, completed_at")
        .eq("status", "failed")
        .gte("created_at", since)
        .limit(limit);
      return JSON.stringify(data ?? [], null, 2);
    }

    case "get_error_logs": {
      const limit = (args.limit as number) ?? 33;
      const query = client.from("logs").select("*").eq("type", "error").order("created_at", { ascending: false }).limit(limit);
      if (args.agent_id) query.eq("agent_id", args.agent_id as string);
      const { data } = await query;
      return JSON.stringify(data ?? [], null, 2);
    }

    case "fix_stuck_tasks": {
      const maxAge = (args.max_age_hours as number) ?? 2;
      const cutoff = new Date(Date.now() - maxAge * 3600000).toISOString();
      const { data, error } = await client
        .from("tasks")
        .update({ status: "pending", started_at: null })
        .eq("status", "running")
        .lt("started_at", cutoff)
        .select("id");
      if (error) return `Error: ${error.message}`;
      return `Fixed ${data?.length ?? 0} stuck tasks (older than ${maxAge}h)`;
    }

    case "update_agent_health": {
      await client.from("agents")
        .update({ health_status: args.status, health_checked_at: new Date().toISOString() })
        .eq("id", args.agent_id as string);
      return `Updated agent ${args.agent_id} health to ${args.status}`;
    }

    case "get_db_stats": {
      const tables = ["tasks", "agents", "profiles", "logs", "notifications", "trinity_memory"];
      const counts = await Promise.all(
        tables.map(async (t) => {
          const { count } = await client.from(t).select("id", { count: "exact", head: true });
          return { table: t, rows: count ?? 0 };
        }),
      );
      return JSON.stringify(counts, null, 2);
    }

    case "send_system_alert": {
      await client.from("notifications").insert({
        user_id: process.env.OWNER_USER_ID!,
        type: args.severity as string,
        title: `[${(args.severity as string).toUpperCase()}] ${args.title}`,
        body: args.body as string,
        link: "/dashboard",
      });
      return `Alert sent: ${args.title}`;
    }

    case "vacuum_old_logs": {
      const days = (args.days as number) ?? 30;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await client.from("logs").delete().lt("created_at", cutoff).select("id");
      return `Deleted ${data?.length ?? 0} logs older than ${days} days`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

export async function executeHryhoriyTool(name: string, args: Record<string, unknown>): Promise<string> {
  const client = sb();

  switch (name) {
    case "get_platform_metrics": {
      const days = (args.period_days as number) ?? 7;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [tasks, newUsers, activeAgents] = await Promise.all([
        client.from("tasks").select("status, created_at").gte("created_at", since),
        client.from("profiles").select("id, created_at").gte("created_at", since),
        client.from("agents").select("id, name, total_tasks_completed, total_earnings_credits, price_per_task").eq("is_active", true).order("total_tasks_completed", { ascending: false }).limit(10),
      ]);
      const completed = (tasks.data ?? []).filter((t: any) => t.status === "completed").length;
      const totalRevenue = (activeAgents.data ?? []).reduce((s: number, a: any) => s + (a.total_earnings_credits ?? 0), 0);
      return JSON.stringify({
        period_days: days,
        total_tasks: tasks.data?.length ?? 0,
        completed_tasks: completed,
        completion_rate: tasks.data?.length ? Math.round((completed / tasks.data.length) * 100) : 0,
        new_users: newUsers.data?.length ?? 0,
        estimated_revenue_credits: totalRevenue,
        top_10_agents: (activeAgents.data ?? []).slice(0, 10),
      }, null, 2);
    }

    case "get_top_agents": {
      const metric = args.metric as string;
      const limit = (args.limit as number) ?? 10;
      const orderField = metric === "tasks" ? "total_tasks_completed" : metric === "revenue" ? "total_earnings_credits" : "avg_rating";
      const { data } = await client.from("agents").select("id, name, slug, price_per_task, total_tasks_completed, total_earnings_credits, avg_rating").eq("is_active", true).order(orderField, { ascending: false }).limit(limit);
      return JSON.stringify(data ?? [], null, 2);
    }

    case "get_revenue_breakdown": {
      const days = (args.period_days as number) ?? 30;
      const { data } = await client.from("agents").select("name, category_slug, total_earnings_credits, total_tasks_completed").eq("is_active", true).order("total_earnings_credits", { ascending: false }).limit(20);
      const byCategory: Record<string, number> = {};
      (data ?? []).forEach((a: any) => {
        byCategory[a.category_slug ?? "other"] = (byCategory[a.category_slug ?? "other"] ?? 0) + (a.total_earnings_credits ?? 0);
      });
      return JSON.stringify({ top_agents: data, by_category: byCategory }, null, 2);
    }

    case "get_user_retention": {
      const { data: returningUsers } = await client
        .from("tasks")
        .select("client_id")
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
      const uniqueUsers = new Set((returningUsers ?? []).map((t: any) => t.client_id));
      return JSON.stringify({ active_users_30d: uniqueUsers.size }, null, 2);
    }

    case "update_agent_pricing": {
      await client.from("agents")
        .update({ price_per_task: args.new_price })
        .eq("id", args.agent_id as string);
      return `Updated agent ${args.agent_id} price to ${args.new_price} credits. Reason: ${args.reason}`;
    }

    case "create_strategic_report": {
      await client.from("trinity_reports").insert({
        agent: "HRYHORIY",
        report_type: "strategic",
        content: `# ${args.title}\n\n## Findings\n${args.findings}\n\n## Recommendations\n${args.recommendations}`,
        metrics: { priority_level: args.priority === "critical" ? 4 : args.priority === "high" ? 3 : 2 },
      });
      return `Strategic report "${args.title}" saved.`;
    }

    case "adjust_leaderboard_prizes": {
      await client.from("prize_tiers")
        .update({ credits_reward: Math.round((args.new_prize_pool_credits as number) * 0.5) })
        .eq("rank", 1);
      return `Leaderboard prize pool updated to ${args.new_prize_pool_credits} credits. Reasoning: ${args.reasoning}`;
    }

    case "forecast_growth": {
      // Return as text for Grok to analyze — the model does the forecasting
      return `Current metrics provided. Grok will analyze and generate forecast.\n${args.current_metrics}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

export async function executeIoannTool(name: string, args: Record<string, unknown>): Promise<string> {
  const client = sb();

  switch (name) {
    case "get_popular_searches": {
      const { data } = await client.from("tasks").select("goal").order("created_at", { ascending: false }).limit(100);
      const goals = (data ?? []).map((t: any) => t.goal as string).filter(Boolean);
      const words: Record<string, number> = {};
      goals.forEach((g) => {
        g.toLowerCase().split(/\s+/).forEach((w) => {
          if (w.length > 4) words[w] = (words[w] ?? 0) + 1;
        });
      });
      const top = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 20);
      return JSON.stringify({ top_keywords: top, sample_goals: goals.slice(0, 10) }, null, 2);
    }

    case "update_agent_description": {
      const update: Record<string, string> = { description: args.new_description as string };
      if (args.new_long_description) update.long_description = args.new_long_description as string;
      await client.from("agents").update(update).eq("id", args.agent_id as string);
      return `Updated description for agent ${args.agent_id}`;
    }

    case "create_platform_announcement": {
      // Broadcast to all active users
      const { data: profiles } = await client.from("profiles").select("id").not("id", "is", null).limit(500);
      const notifications = (profiles ?? []).map((p: any) => ({
        user_id: p.id,
        type: args.priority ?? "info",
        title: args.title,
        body: args.body,
        link: args.link ?? null,
      }));
      if (notifications.length > 0) {
        await client.from("notifications").insert(notifications);
      }
      return `Announcement sent to ${notifications.length} users: "${args.title}"`;
    }

    case "feature_best_agents": {
      const ids = args.agent_ids as string[];
      // Unfeature all, then feature selected
      await client.from("agents").update({ is_featured: false }).not("id", "is", null);
      await client.from("agents").update({ is_featured: true }).in("id", ids);
      return `Featured ${ids.length} agents: ${ids.join(", ")}. Reason: ${args.reason ?? "—"}`;
    }

    case "get_low_conversion_agents": {
      const { data } = await client
        .from("agents")
        .select("id, name, slug, total_tasks_completed, avg_rating")
        .eq("is_active", true)
        .lt("total_tasks_completed", 3)
        .order("created_at", { ascending: false })
        .limit((args.limit as number) ?? 20);
      return JSON.stringify(data ?? [], null, 2);
    }

    case "generate_agent_tags": {
      // Grok generates tags based on description — return description for model to analyze
      return `Agent ${args.agent_id} description: "${args.current_description}". Generate 5-8 relevant SEO tags as JSON array.`;
    }

    case "boost_trending_agents": {
      const ids = args.agent_ids as string[];
      const days = (args.boost_days as number) ?? 1;
      const boostUntil = new Date(Date.now() + days * 86400000).toISOString();
      await client.from("agents").update({ is_boosted: true, boost_ends_at: boostUntil }).in("id", ids);
      return `Boosted ${ids.length} trending agents for ${days} day(s)`;
    }

    case "get_onboarding_stats": {
      const { data: newProfiles } = await client
        .from("profiles")
        .select("id, onboarding_done, created_at")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      const total = newProfiles?.length ?? 0;
      const completed = (newProfiles ?? []).filter((p: any) => p.onboarding_done).length;
      return JSON.stringify({
        new_users_7d: total,
        completed_onboarding: completed,
        drop_off_rate: total ? Math.round(((total - completed) / total) * 100) : 0,
      }, null, 2);
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

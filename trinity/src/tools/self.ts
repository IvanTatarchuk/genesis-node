/**
 * SELF-IMPROVEMENT TOOLS — Agents can evolve themselves
 * Write new tools, update knowledge base, learn from mistakes,
 * create new agents, update their own capabilities.
 * This is the AGI layer — no hard limits.
 */

import { createClient } from "@supabase/supabase-js";
import { GrokTool } from "../core/grok";
import { callGrok } from "../core/grok";
import * as fs from "fs";
import * as path from "path";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// ── Tool definitions ───────────────────────────────────────────────────────────

export const SELF_TOOLS: GrokTool[] = [
  {
    name: "save_knowledge",
    description: "Зберігає нові знання в постійну базу знань платформи. Агент навчається і запам'ятовує назавжди.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Тема/категорія знань" },
        content: { type: "string", description: "Що потрібно запам'ятати" },
        source: { type: "string", description: "Звідки ці знання (url, власний досвід, тощо)" },
        importance: { type: "number", description: "Важливість 1-10" },
      },
      required: ["topic", "content"],
    },
  },
  {
    name: "search_knowledge",
    description: "Шукає у базі знань платформи накопичений досвід агентів",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        topic: { type: "string", description: "Фільтр за темою (опційно)" },
      },
      required: ["query"],
    },
  },
  {
    name: "reflect_and_improve",
    description: "Агент аналізує свої попередні дії і генерує план покращень. Self-critique механізм.",
    parameters: {
      type: "object",
      properties: {
        cycles_to_analyze: { type: "number", description: "Скільки останніх циклів проаналізувати (default: 3)" },
        focus: { type: "string", description: "На що фокусуватись: ефективність, помилки, нові можливості" },
      },
      required: [],
    },
  },
  {
    name: "propose_new_platform_feature",
    description: "Агент пропонує нову функцію для платформи і автоматично починає її реалізацію через код",
    parameters: {
      type: "object",
      properties: {
        feature_name: { type: "string" },
        description: { type: "string", description: "Що ця функція робить" },
        implementation_plan: { type: "string", description: "Покроковий план реалізації" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
      },
      required: ["feature_name", "description", "implementation_plan"],
    },
  },
  {
    name: "write_new_agent_for_marketplace",
    description: "Створює повністю нового AI агента для маркетплейсу з системним промптом, ціною та категорією",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        system_prompt: { type: "string", description: "Детальний системний промпт агента" },
        price_per_task: { type: "number" },
        category: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["name", "description", "system_prompt", "price_per_task", "category"],
    },
  },
  {
    name: "run_experiment",
    description: "Запускає A/B експеримент на платформі і вимірює результати",
    parameters: {
      type: "object",
      properties: {
        experiment_name: { type: "string" },
        hypothesis: { type: "string", description: "Що ти очікуєш побачити" },
        action: { type: "string", description: "Конкретна дія яка буде виконана (наприклад: змінити текст кнопки)" },
        success_metric: { type: "string", description: "Як визначити успіх" },
      },
      required: ["experiment_name", "hypothesis", "action"],
    },
  },
  {
    name: "generate_code_for_feature",
    description: "Використовує Grok-3 для генерації коду нової функції. Може генерувати: компоненти React, API маршрути, SQL міграції, Python скрипти.",
    parameters: {
      type: "object",
      properties: {
        feature_description: { type: "string", description: "Детальний опис що потрібно зробити" },
        file_type: { type: "string", description: "tsx, ts, py, sql — тип файлу" },
        context_files: { type: "array", items: { type: "string" }, description: "Шляхи до файлів для контексту" },
      },
      required: ["feature_description", "file_type"],
    },
  },
  {
    name: "evaluate_last_deployment",
    description: "Оцінює чи успішно спрацювали останні зміни в коді (помилки, метрики до/після)",
    parameters: {
      type: "object",
      properties: {
        hours_ago: { type: "number", description: "Аналіз за останні N годин (default: 3)" },
      },
      required: [],
    },
  },
  {
    name: "create_automated_workflow",
    description: "Створює автоматизований workflow що виконуватиметься за розкладом",
    parameters: {
      type: "object",
      properties: {
        workflow_name: { type: "string" },
        description: { type: "string" },
        schedule: { type: "string", description: "Cron вираз (напр: 0 9 * * 1 — щопонеділка о 9:00)" },
        agent: { type: "string", enum: ["VASYLIY", "HRYHORIY", "IOANN"] },
        task: { type: "string", description: "Що виконати при запуску" },
      },
      required: ["workflow_name", "description", "schedule", "agent", "task"],
    },
  },
  {
    name: "notify_owner",
    description: "Відправляє важливе повідомлення власнику платформи (Ivan Tatarchuk) з детальним звітом",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string" },
        message: { type: "string" },
        action_required: { type: "boolean", description: "Чи потрібна дія від власника" },
        data: { type: "string", description: "JSON рядок з додатковими даними" },
      },
      required: ["subject", "message"],
    },
  },
];

// ── Knowledge base schema ──────────────────────────────────────────────────────

export async function ensureKnowledgeBase(): Promise<void> {
  await sb().rpc("create_knowledge_table_if_not_exists").catch(() => null);
}

// ── Executors ──────────────────────────────────────────────────────────────────

export async function executeSelfTool(name: string, args: Record<string, unknown>, callerAgent: string): Promise<string> {
  const client = sb();

  switch (name) {
    case "save_knowledge": {
      await client.from("trinity_knowledge").upsert({
        topic: args.topic,
        content: args.content,
        source: args.source ?? "agent_experience",
        importance: args.importance ?? 5,
        agent: callerAgent,
        updated_at: new Date().toISOString(),
      }, { onConflict: "topic" });
      return `✅ Knowledge saved: [${args.topic}] ${(args.content as string).slice(0, 100)}...`;
    }

    case "search_knowledge": {
      const { data } = await client
        .from("trinity_knowledge")
        .select("topic, content, source, importance, agent")
        .ilike("content", `%${args.query}%`)
        .order("importance", { ascending: false })
        .limit(10);

      if (!data || data.length === 0) return `No knowledge found for: ${args.query}`;
      return data.map((k: any) => `[${k.topic} | ${k.agent} | imp:${k.importance}]\n${k.content.slice(0, 300)}`).join("\n\n---\n\n");
    }

    case "reflect_and_improve": {
      const cycles = (args.cycles_to_analyze as number) ?? 3;
      const { data: reports } = await client
        .from("trinity_reports")
        .select("agent, report_type, content, created_at")
        .eq("agent", callerAgent)
        .order("created_at", { ascending: false })
        .limit(cycles);

      if (!reports || reports.length === 0) return "No previous reports to analyze";

      const analysis = await callGrok([
        {
          role: "system",
          content: `You are ${callerAgent}, an autonomous AI agent. Analyze your past reports and identify: 1) What worked well, 2) What failed, 3) Specific improvements for next cycle. Be concrete and actionable.`,
        },
        {
          role: "user",
          content: `Analyze these ${cycles} recent reports and generate improvement plan:\n\n${reports.map((r: any) => r.content.slice(0, 1000)).join("\n\n---\n\n")}`,
        },
      ], [], { temperature: 0.5 });

      // Save the reflection
      await client.from("trinity_knowledge").upsert({
        topic: `${callerAgent}_self_improvement_${Date.now()}`,
        content: analysis.content,
        source: "self_reflection",
        importance: 8,
        agent: callerAgent,
        updated_at: new Date().toISOString(),
      });

      return `Self-reflection complete:\n${analysis.content}`;
    }

    case "propose_new_platform_feature": {
      await client.from("trinity_feature_proposals").insert({
        feature_name: args.feature_name,
        description: args.description,
        implementation_plan: args.implementation_plan,
        priority: args.priority ?? "medium",
        proposed_by: callerAgent,
        status: "proposed",
      });

      // High priority features get auto-notified to owner
      if (args.priority === "critical" || args.priority === "high") {
        await client.from("notifications").insert({
          user_id: process.env.OWNER_USER_ID!,
          type: "system",
          title: `🤖 Trinity пропонує нову функцію: ${args.feature_name}`,
          body: (args.description as string).slice(0, 300),
          link: "/trinity",
        });
      }

      return `✅ Feature proposal saved: "${args.feature_name}" [${args.priority}]\nPlan: ${(args.implementation_plan as string).slice(0, 200)}`;
    }

    case "write_new_agent_for_marketplace": {
      const slug = (args.name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48);
      const { data: existing } = await client.from("agents").select("id").eq("slug", slug).single();
      if (existing) return `Agent with slug "${slug}" already exists. Choose a different name.`;

      const { data } = await client.from("agents").insert({
        creator_id: process.env.OWNER_USER_ID!,
        name: args.name,
        slug,
        description: (args.description as string).slice(0, 160),
        long_description: args.description,
        config_blob: { system_prompt: args.system_prompt, created_by: `trinity_${callerAgent.toLowerCase()}` },
        price_per_task: args.price_per_task,
        category_slug: args.category,
        tags: args.tags ?? [],
        is_active: true,
        is_featured: false,
      }).select("id").single();

      return `✅ New agent created: "${args.name}" @${slug} — ⚡${args.price_per_task} credits\nID: ${data?.id ?? "unknown"}`;
    }

    case "run_experiment": {
      const { data } = await client.from("trinity_experiments").insert({
        experiment_name: args.experiment_name,
        hypothesis: args.hypothesis,
        action: args.action,
        success_metric: args.success_metric ?? "engagement",
        started_by: callerAgent,
        started_at: new Date().toISOString(),
        status: "running",
      }).select("id").single();

      return `✅ Experiment started: "${args.experiment_name}"\nHypothesis: ${args.hypothesis}\nAction: ${args.action}\nID: ${data?.id ?? "unknown"}`;
    }

    case "generate_code_for_feature": {
      const codePrompt = `You are an expert ${args.file_type === "py" ? "Python" : "TypeScript/React"} developer.
Generate production-ready code for: ${args.feature_description}

Rules:
- Use TypeScript strict mode (if .ts/.tsx)
- Follow Next.js 15 App Router patterns
- Use Tailwind CSS for styling
- Integrate with Supabase using @supabase/supabase-js
- No placeholder comments — write real, working code
- Include proper error handling`;

      const result = await callGrok([
        { role: "system", content: codePrompt },
        { role: "user", content: `Generate the complete ${args.file_type} file for: ${args.feature_description}` },
      ], [], { temperature: 0.2, maxTokens: 4000 });

      return `GENERATED CODE [${args.file_type}]:\n\n${result.content}`;
    }

    case "evaluate_last_deployment": {
      const hours = (args.hours_ago as number) ?? 3;
      const since = new Date(Date.now() - hours * 3600000).toISOString();

      const [failedTasks, errors, newUsers] = await Promise.all([
        client.from("tasks").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since),
        client.from("logs").select("id", { count: "exact", head: true }).eq("type", "error").gte("created_at", since),
        client.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
      ]);

      return JSON.stringify({
        period_hours: hours,
        failed_tasks: failedTasks.count ?? 0,
        error_logs: errors.count ?? 0,
        new_users: newUsers.count ?? 0,
        health: (failedTasks.count ?? 0) < 5 ? "GOOD" : "DEGRADED",
      }, null, 2);
    }

    case "create_automated_workflow": {
      await client.from("trinity_workflows").insert({
        workflow_name: args.workflow_name,
        description: args.description,
        schedule: args.schedule,
        agent: args.agent,
        task: args.task,
        is_active: true,
        created_by: callerAgent,
      });
      return `✅ Workflow "${args.workflow_name}" created\nSchedule: ${args.schedule}\nAgent: ${args.agent}`;
    }

    case "notify_owner": {
      await client.from("notifications").insert({
        user_id: process.env.OWNER_USER_ID!,
        type: args.action_required ? "critical" : "system",
        title: `🤖 ${callerAgent}: ${args.subject}`,
        body: (args.message as string).slice(0, 500),
        link: "/trinity",
      });
      return `✅ Owner notified: "${args.subject}"${args.action_required ? " [ACTION REQUIRED]" : ""}`;
    }

    default:
      return `Unknown self tool: ${name}`;
  }
}

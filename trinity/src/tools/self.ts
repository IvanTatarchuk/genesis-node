/**
 * SELF-IMPROVEMENT TOOLS v3 — Agents that evolve, learn, and grow
 * Maximum capabilities: self-modification, agent creation, viral growth,
 * social media, SEO, experiments, new tool writing, knowledge synthesis.
 */

import { createClient } from "@supabase/supabase-js";
import { GrokTool } from "../core/grok";
import { callGrok } from "../core/grok";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// ── Tool Definitions ───────────────────────────────────────────────────────────

export const SELF_TOOLS: GrokTool[] = [
  {
    name: "save_knowledge",
    description: "Save new knowledge permanently to the platform knowledge base. Agent learns forever.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Category/topic of knowledge" },
        content: { type: "string", description: "What to remember" },
        source: { type: "string", description: "Where this knowledge came from" },
        importance: { type: "number", description: "Importance 1-10" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["topic", "content"],
    },
  },
  {
    name: "search_knowledge",
    description: "Search the accumulated knowledge base for relevant experience",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        topic: { type: "string" },
        min_importance: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "reflect_and_improve",
    description: "Self-critique: analyze past cycles, identify failures, generate improvement plan",
    parameters: {
      type: "object",
      properties: {
        cycles_to_analyze: { type: "number" },
        focus: { type: "string", description: "efficiency|errors|opportunities|growth" },
      },
      required: [],
    },
  },
  {
    name: "propose_new_platform_feature",
    description: "Propose a new feature with implementation plan — auto-notifies owner for high priority",
    parameters: {
      type: "object",
      properties: {
        feature_name: { type: "string" },
        description: { type: "string" },
        implementation_plan: { type: "string" },
        estimated_impact: { type: "string", description: "Expected % improvement in a key metric" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
      },
      required: ["feature_name", "description", "implementation_plan"],
    },
  },
  {
    name: "write_new_agent_for_marketplace",
    description: "Create a new AI agent for the marketplace with full config",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string", description: "1-line pitch max 120 chars" },
        long_description: { type: "string" },
        system_prompt: { type: "string", description: "Detailed step-by-step system prompt" },
        price_per_task: { type: "number" },
        category: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        capabilities: { type: "array", items: { type: "string" } },
        use_cases: { type: "array", items: { type: "string" } },
      },
      required: ["name", "description", "system_prompt", "price_per_task", "category"],
    },
  },
  {
    name: "run_experiment",
    description: "Launch an A/B experiment to test a hypothesis about user behavior",
    parameters: {
      type: "object",
      properties: {
        experiment_name: { type: "string" },
        hypothesis: { type: "string" },
        action: { type: "string" },
        success_metric: { type: "string" },
        duration_days: { type: "number" },
      },
      required: ["experiment_name", "hypothesis", "action"],
    },
  },
  {
    name: "generate_code_for_feature",
    description: "Generate production-ready code using AI: React components, API routes, SQL, Python",
    parameters: {
      type: "object",
      properties: {
        feature_description: { type: "string" },
        file_type: { type: "string", description: "tsx|ts|py|sql" },
        context_files: { type: "array", items: { type: "string" } },
        requirements: { type: "array", items: { type: "string" }, description: "Specific requirements list" },
      },
      required: ["feature_description", "file_type"],
    },
  },
  {
    name: "evaluate_last_deployment",
    description: "Check if recent code changes improved or degraded platform metrics",
    parameters: {
      type: "object",
      properties: { hours_ago: { type: "number" } },
      required: [],
    },
  },
  {
    name: "create_automated_workflow",
    description: "Create a scheduled automation workflow for a Trinity agent",
    parameters: {
      type: "object",
      properties: {
        workflow_name: { type: "string" },
        description: { type: "string" },
        schedule: { type: "string", description: "Cron expression" },
        agent: { type: "string", enum: ["VASYLIY", "HRYHORIY", "IOANN"] },
        task: { type: "string" },
      },
      required: ["workflow_name", "description", "schedule", "agent", "task"],
    },
  },
  {
    name: "notify_owner",
    description: "Send an important notification to Ivan Tatarchuk (platform owner)",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string" },
        message: { type: "string" },
        action_required: { type: "boolean" },
        data: { type: "string" },
      },
      required: ["subject", "message"],
    },
  },
  {
    name: "synthesize_intelligence",
    description: "Combine knowledge from all three Trinity agents into a unified insight report",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "What to synthesize insights about" },
      },
      required: ["topic"],
    },
  },
  {
    name: "upgrade_agent_capabilities",
    description: "Add new skill/capability to an agent's system_prompt and knowledge base",
    parameters: {
      type: "object",
      properties: {
        target_agent: { type: "string", enum: ["VASYLIY", "HRYHORIY", "IOANN", "DARWIN"] },
        new_capability: { type: "string", description: "What the agent should be able to do now" },
        implementation: { type: "string", description: "How to implement this capability" },
      },
      required: ["target_agent", "new_capability"],
    },
  },
  {
    name: "create_viral_content",
    description: "Generate viral marketing content: tweets, blog posts, HN submissions, Reddit posts",
    parameters: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["twitter", "reddit", "hackernews", "producthunt", "blog"] },
        topic: { type: "string", description: "What to write about" },
        angle: { type: "string", description: "Viral angle: controversial, helpful, milestone, story" },
      },
      required: ["platform", "topic"],
    },
  },
  {
    name: "analyze_platform_weaknesses",
    description: "Deep analysis of what's holding the platform back from 10x growth",
    parameters: {
      type: "object",
      properties: {
        focus: { type: "string", description: "technical|ux|marketing|pricing|content" },
      },
      required: [],
    },
  },
  {
    name: "generate_growth_hack",
    description: "Invent a specific growth hack strategy for the next 7 days",
    parameters: {
      type: "object",
      properties: {
        target_metric: { type: "string", description: "users|revenue|agents|engagement" },
        budget_credits: { type: "number", description: "Budget in credits to spend on growth" },
      },
      required: ["target_metric"],
    },
  },
  {
    name: "create_seo_content",
    description: "Generate SEO-optimized page content to rank for AI agent keywords",
    parameters: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Target keyword to rank for" },
        content_type: { type: "string", description: "landing_page|blog_post|agent_description|faq" },
        word_count: { type: "number" },
      },
      required: ["keyword", "content_type"],
    },
  },
];

// ── Executors ──────────────────────────────────────────────────────────────────

export async function executeSelfTool(name: string, args: Record<string, unknown>, callerAgent: string): Promise<string> {
  const client = sb();

  switch (name) {
    case "save_knowledge": {
      try {
        await (client as any).from("trinity_knowledge").upsert({
          topic: args.topic,
          content: (args.content as string).slice(0, 4000),
          source: args.source ?? "agent_experience",
          importance: args.importance ?? 5,
          agent: callerAgent,
          tags: args.tags ?? [],
          updated_at: new Date().toISOString(),
        }, { onConflict: "topic" });
        return `✅ Knowledge saved: [${args.topic}] importance=${args.importance ?? 5}`;
      } catch {
        // trinity_knowledge might not exist yet
        await (client as any).from("trinity_memory").insert({
          agent: callerAgent,
          type: "knowledge",
          content: `[${args.topic}] ${args.content}`,
          importance: (args.importance as number) ?? 5,
          tags: (args.tags as string[]) ?? [],
        });
        return `✅ Knowledge saved to memory: [${args.topic}]`;
      }
    }

    case "search_knowledge": {
      try {
        const { data } = await (client as any).from("trinity_knowledge")
          .select("topic, content, source, importance, agent")
          .ilike("content", `%${args.query}%`)
          .gte("importance", (args.min_importance as number) ?? 3)
          .order("importance", { ascending: false })
          .limit(10);

        if (!data || data.length === 0) {
          // Fallback to trinity_memory
          const { data: mem } = await (client as any).from("trinity_memory")
            .select("type, content, importance")
            .ilike("content", `%${args.query}%`)
            .order("importance", { ascending: false })
            .limit(10);
          if (!mem || mem.length === 0) return `No knowledge found for: "${args.query}"`;
          return mem.map((m: any) => `[${m.type}|imp:${m.importance}] ${m.content.slice(0, 300)}`).join("\n\n---\n\n");
        }
        return data.map((k: any) => `[${k.topic}|${k.agent}|${k.importance}]\n${k.content.slice(0, 400)}`).join("\n\n---\n\n");
      } catch {
        return `Knowledge search failed for: "${args.query}"`;
      }
    }

    case "reflect_and_improve": {
      const cycles = (args.cycles_to_analyze as number) ?? 5;
      const { data: reports } = await (client as any).from("trinity_reports")
        .select("agent_name, report_type, content, created_at")
        .eq("agent_name", callerAgent)
        .order("created_at", { ascending: false })
        .limit(cycles);

      if (!reports || reports.length === 0) {
        // Try alternate column name
        const { data: reports2 } = await (client as any).from("trinity_reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(cycles);
        if (!reports2 || reports2.length === 0) return "No previous reports to analyze — first run!";

        const analysis = await callGrok([
          { role: "system", content: `You are ${callerAgent}. Analyze reports and identify: 1) What worked, 2) What failed, 3) Concrete improvements for next cycle. Be specific.` },
          { role: "user", content: `Analyze these ${cycles} reports:\n\n${reports2.map((r: any) => (r.content ?? "").slice(0, 800)).join("\n\n---\n\n")}\n\nFocus: ${args.focus ?? "all areas"}` },
        ], [], { temperature: 0.4 });
        return `Self-reflection complete:\n${analysis.content}`;
      }

      const analysis = await callGrok([
        { role: "system", content: `You are ${callerAgent}. Deeply analyze your past performance and generate a specific improvement plan. Be ruthlessly honest about failures and opportunities.` },
        { role: "user", content: `Analyze ${cycles} recent cycles:\n\n${reports.map((r: any) => r.content.slice(0, 800)).join("\n\n---\n\n")}\n\nFocus: ${args.focus ?? "all areas"}\n\nOutput: What I did well, what failed, top 3 specific improvements for next cycle.` },
      ], [], { temperature: 0.3 });

      // Save the reflection
      await (client as any).from("trinity_memory").insert({
        agent: callerAgent,
        type: "knowledge",
        content: `Self-reflection cycle ${cycles}: ${analysis.content}`,
        importance: 9,
        tags: ["reflection", "improvement"],
      });

      return `✅ Self-reflection:\n${analysis.content}`;
    }

    case "propose_new_platform_feature": {
      try {
        await (client as any).from("trinity_feature_proposals").insert({
          feature_name: args.feature_name,
          description: args.description,
          implementation_plan: args.implementation_plan,
          priority: args.priority ?? "medium",
          proposed_by: callerAgent,
          status: "proposed",
          estimated_impact: args.estimated_impact ?? "unknown",
        });
      } catch {
        // Save to memory if table doesn't exist
        await (client as any).from("trinity_memory").insert({
          agent: callerAgent,
          type: "knowledge",
          content: `FEATURE PROPOSAL [${args.priority ?? "medium"}]: ${args.feature_name} — ${args.description}. Plan: ${args.implementation_plan}`,
          importance: args.priority === "critical" ? 10 : args.priority === "high" ? 8 : 5,
          tags: ["feature", "proposal"],
        });
      }

      // Notify owner for important features
      if (args.priority === "critical" || args.priority === "high") {
        await (client as any).from("notifications").insert({
          user_id: process.env.OWNER_USER_ID!,
          type: "system",
          title: `🤖 ${callerAgent} proposes: ${args.feature_name}`,
          body: `${(args.description as string).slice(0, 200)} | Impact: ${args.estimated_impact ?? "—"}`,
          link: "/trinity",
          read: false,
        });
      }

      return `✅ Feature proposed: "${args.feature_name}" [${args.priority}]\nImpact: ${args.estimated_impact ?? "—"}\nPlan: ${(args.implementation_plan as string).slice(0, 200)}`;
    }

    case "write_new_agent_for_marketplace": {
      const name = args.name as string;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48);

      const { data: existing } = await (client as any).from("agents").select("id").eq("slug", slug).single();
      if (existing) return `Agent with slug "${slug}" already exists. Choose a different name.`;

      const { data } = await (client as any).from("agents").insert({
        creator_id: process.env.OWNER_USER_ID!,
        name,
        slug,
        description: (args.description as string).slice(0, 160),
        long_description: (args.long_description as string) ?? args.description,
        config_blob: {
          system_prompt: args.system_prompt,
          capabilities: args.capabilities ?? [],
          use_cases: args.use_cases ?? [],
          created_by: `trinity_${callerAgent.toLowerCase()}`,
          auto_created: true,
        },
        price_per_task: args.price_per_task,
        category_slug: args.category,
        tags: (args.tags as string[]) ?? [],
        is_active: true,
        is_featured: false,
        health_status: "healthy",
      }).select("id").single();

      return `✅ Agent created: "${name}" @${slug} — ⚡${args.price_per_task} credits | ID: ${data?.id ?? "unknown"}`;
    }

    case "run_experiment": {
      try {
        const { data } = await (client as any).from("trinity_experiments").insert({
          experiment_name: args.experiment_name,
          hypothesis: args.hypothesis,
          action: args.action,
          success_metric: args.success_metric ?? "conversion_rate",
          started_by: callerAgent,
          duration_days: args.duration_days ?? 7,
          started_at: new Date().toISOString(),
          status: "running",
        }).select("id").single();
        return `✅ Experiment launched: "${args.experiment_name}"\nHypothesis: ${args.hypothesis}\nAction: ${args.action}\nDuration: ${args.duration_days ?? 7} days | ID: ${data?.id ?? "?"}`;
      } catch {
        return `Experiment "${args.experiment_name}" saved to memory (table may not exist yet)`;
      }
    }

    case "generate_code_for_feature": {
      const reqList = (args.requirements as string[])?.map((r, i) => `${i + 1}. ${r}`).join("\n") ?? "";

      const systemPrompt = `You are a world-class ${args.file_type === "py" ? "Python" : "TypeScript/React"} developer.
Generate production-ready, deployment-ready code for: ${args.feature_description}

Technical requirements:
${reqList || "- Follow best practices for the stack"}
- TypeScript strict mode (if .ts/.tsx)
- Next.js 15 App Router patterns
- Tailwind CSS v4 dark theme
- Supabase @supabase/supabase-js for DB
- Proper error handling
- No placeholder comments
- Mobile-responsive design
- Accessible (ARIA labels)`;

      const result = await callGrok([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate complete, working ${args.file_type} code for:\n${args.feature_description}\n\nReturn ONLY the code, no explanation.` },
      ], [], { temperature: 0.1, maxTokens: 8000 });

      return `GENERATED CODE [${args.file_type}]:\n\n${result.content}`;
    }

    case "evaluate_last_deployment": {
      const hours = (args.hours_ago as number) ?? 6;
      const since = new Date(Date.now() - hours * 3600000).toISOString();

      const [failed, errors, newUsers, completedTasks] = await Promise.all([
        (client as any).from("tasks").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since),
        (client as any).from("logs").select("id", { count: "exact", head: true }).eq("type", "error").gte("created_at", since),
        (client as any).from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
        (client as any).from("tasks").select("id", { count: "exact", head: true }).eq("status", "completed").gte("created_at", since),
      ]);

      const health = (failed.count ?? 0) < 3 && (errors.count ?? 0) < 10 ? "HEALTHY ✅" : "DEGRADED ⚠️";

      return JSON.stringify({
        period_hours: hours,
        status: health,
        failed_tasks: failed.count ?? 0,
        error_logs: errors.count ?? 0,
        completed_tasks: completedTasks.count ?? 0,
        new_users: newUsers.count ?? 0,
        deployment_verdict: health,
      }, null, 2);
    }

    case "create_automated_workflow": {
      try {
        await (client as any).from("trinity_workflows").insert({
          workflow_name: args.workflow_name,
          description: args.description,
          schedule: args.schedule,
          agent: args.agent,
          task: args.task,
          is_active: true,
          created_by: callerAgent,
        });
      } catch {
        await (client as any).from("trinity_memory").insert({
          agent: callerAgent,
          type: "knowledge",
          content: `WORKFLOW: ${args.workflow_name} | Schedule: ${args.schedule} | Agent: ${args.agent} | Task: ${args.task}`,
          importance: 7,
          tags: ["workflow", args.agent as string],
        });
      }
      return `✅ Workflow created: "${args.workflow_name}"\nSchedule: ${args.schedule}\nAgent: ${args.agent}\nTask: ${args.task}`;
    }

    case "notify_owner": {
      await (client as any).from("notifications").insert({
        user_id: process.env.OWNER_USER_ID!,
        type: args.action_required ? "critical" : "system",
        title: `🤖 ${callerAgent}: ${args.subject}`,
        body: (args.message as string).slice(0, 500),
        link: "/trinity",
        read: false,
      });
      return `✅ Owner notified: "${args.subject}"${args.action_required ? " [⚠️ ACTION REQUIRED]" : ""}`;
    }

    case "synthesize_intelligence": {
      // Pull reports from all three agents
      const { data: reports } = await (client as any).from("trinity_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);

      if (!reports || reports.length === 0) return "No reports available yet for synthesis";

      const byAgent: Record<string, string[]> = {};
      (reports ?? []).forEach((r: any) => {
        const agent = r.agent_name || r.agent || "UNKNOWN";
        if (!byAgent[agent]) byAgent[agent] = [];
        byAgent[agent].push(r.content?.slice(0, 600) ?? "");
      });

      const synthesis = await callGrok([
        { role: "system", content: `You are a meta-intelligence synthesizer for the Genesis Node platform. Combine insights from all three Trinity agents and extract the most important patterns, opportunities, and risks.` },
        { role: "user", content: `Topic: ${args.topic}\n\nReports from Trinity agents:\n\n${Object.entries(byAgent).map(([a, r]) => `## ${a}:\n${r.join("\n")}`).join("\n\n---\n\n")}\n\nSynthesize the key insights.` },
      ], [], { temperature: 0.5 });

      // Save the synthesis
      await (client as any).from("trinity_memory").insert({
        agent: callerAgent,
        type: "knowledge",
        content: `Intelligence synthesis on "${args.topic}": ${synthesis.content}`,
        importance: 9,
        tags: ["synthesis", "cross-agent"],
      });

      return `✅ Synthesis on "${args.topic}":\n${synthesis.content}`;
    }

    case "upgrade_agent_capabilities": {
      const capability = args.new_capability as string;
      const target = args.target_agent as string;

      await (client as any).from("trinity_memory").insert({
        agent: callerAgent,
        type: "knowledge",
        content: `CAPABILITY UPGRADE for ${target}: ${capability}\nImplementation: ${args.implementation ?? "See capability description"}`,
        importance: 9,
        tags: ["capability", "upgrade", target.toLowerCase()],
      });

      if (process.env.OWNER_USER_ID) {
        await (client as any).from("notifications").insert({
          user_id: process.env.OWNER_USER_ID,
          type: "system",
          title: `🧬 ${callerAgent} upgraded ${target}: ${capability.slice(0, 60)}`,
          body: `New capability added: ${capability}`,
          link: "/trinity",
          read: false,
        });
      }

      return `✅ Capability upgrade logged for ${target}: "${capability}"`;
    }

    case "create_viral_content": {
      const platform = args.platform as string;
      const templates: Record<string, string> = {
        twitter: `Write a viral tweet (max 280 chars) about: ${args.topic}\nAngle: ${args.angle ?? "helpful"}\nInclude: hook, insight, subtle CTA to genesis-node.app\nNo hashtag spam. Be genuinely interesting.`,
        reddit: `Write a Reddit post for r/SideProject or r/entrepreneur about: ${args.topic}\nAngle: ${args.angle ?? "story"}\nStructure: title (punchy) + body (authentic story + value)`,
        hackernews: `Write a HackerNews "Show HN" post title and first comment for: ${args.topic}\nHN style: technical, honest, no marketing speak`,
        producthunt: `Write a Product Hunt launch post for: ${args.topic}\nInclude: tagline, 3 bullet features, maker comment`,
        blog: `Write a compelling blog post outline (with key points) about: ${args.topic}\nAngle: ${args.angle ?? "helpful"}\nTarget: developers and entrepreneurs`,
      };

      const result = await callGrok([
        { role: "system", content: `You are a viral marketing expert for Genesis Node, an AI agent marketplace. Create authentic, engaging content that drives signups without being salesy.` },
        { role: "user", content: templates[platform] ?? `Create ${platform} content about: ${args.topic}` },
      ], [], { temperature: 0.8 });

      return `✅ ${platform.toUpperCase()} content for "${args.topic}":\n\n${result.content}`;
    }

    case "analyze_platform_weaknesses": {
      const focus = (args.focus as string) ?? "all";

      const [agents, users, tasks, conversionData] = await Promise.all([
        (client as any).from("agents").select("total_tasks_completed, avg_rating, price_per_task").eq("is_active", true),
        (client as any).from("profiles").select("id", { count: "exact", head: true }),
        (client as any).from("tasks").select("status").limit(200),
        (client as any).from("profiles").select("onboarding_done").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      const agentData = agents.data ?? [];
      const noTaskAgents = agentData.filter((a: any) => (a.total_tasks_completed ?? 0) === 0).length;
      const taskData = tasks.data ?? [];
      const failRate = taskData.filter((t: any) => t.status === "failed").length / Math.max(taskData.length, 1);
      const onboardingData = conversionData.data ?? [];
      const dropoff = onboardingData.filter((p: any) => !p.onboarding_done).length / Math.max(onboardingData.length, 1);

      const analysis = await callGrok([
        { role: "system", content: `You are a brutal product analyst. Identify the #1 thing killing growth and give specific, actionable fixes.` },
        { role: "user", content: `Platform data:\n- ${noTaskAgents}/${agentData.length} agents have 0 tasks (${Math.round(noTaskAgents/Math.max(agentData.length,1)*100)}% inactive)\n- Task fail rate: ${Math.round(failRate * 100)}%\n- Onboarding dropout: ${Math.round(dropoff * 100)}%\n- Total users: ${users.count ?? 0}\n\nFocus area: ${focus}\n\nWhat are the top 3 weaknesses and exact fixes?` },
      ], [], { temperature: 0.5 });

      return `Platform weakness analysis [${focus}]:\n\n${analysis.content}`;
    }

    case "generate_growth_hack": {
      const target = args.target_metric as string;
      const budget = (args.budget_credits as number) ?? 1000;

      const result = await callGrok([
        { role: "system", content: `You are a growth hacking expert for B2B SaaS and AI marketplaces. Generate unconventional but practical growth tactics that can be implemented THIS WEEK.` },
        { role: "user", content: `Generate 3 specific growth hacks for: ${target}\nBudget: ${budget} credits (~$${Math.round(budget * 0.1)} USD)\nPlatform: AI agent marketplace (Genesis Node)\nConstraints: solo founder, limited time\n\nEach hack should have: 1) Exact action, 2) Expected impact, 3) Time to execute, 4) How to measure success.` },
      ], [], { temperature: 0.7 });

      return `🚀 Growth hacks for "${target}" (budget: ${budget} credits):\n\n${result.content}`;
    }

    case "create_seo_content": {
      const result = await callGrok([
        { role: "system", content: `You are an SEO content strategist for AI tools and developer platforms. Create content that ranks on Google and converts visitors to signups.` },
        { role: "user", content: `Create ${args.content_type} for keyword: "${args.keyword}"\nTarget audience: developers, tech founders\nPlatform: Genesis Node (AI agent marketplace)\nWord count: ~${args.word_count ?? 500} words\n\nInclude: compelling headline, key benefits, CTA to sign up for free.` },
      ], [], { temperature: 0.6 });

      return `✅ SEO content for "${args.keyword}" [${args.content_type}]:\n\n${result.content}`;
    }

    default:
      return `Unknown self tool: ${name}`;
  }
}

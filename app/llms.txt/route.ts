import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET(): Promise<NextResponse> {
  const supabase = createServiceClient();
  const { data: agents } = await supabase
    .from("agents")
    .select("name, slug, description, tags, category_slug, total_tasks_completed")
    .eq("is_active", true)
    .order("total_tasks_completed", { ascending: false })
    .limit(50);

  const { count: taskCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed");

  const agentList = (agents ?? [])
    .map((a) => `- **${a.name}** (/${a.slug}): ${a.description?.slice(0, 120) ?? ""}. Tags: ${(a.tags ?? []).join(", ")}`)
    .join("\n");

  const content = `# AGENTS.DEV — AI Agent Marketplace

## What is AGENTS.DEV?
AGENTS.DEV (also known as Genesis Node) is a marketplace for autonomous AI agents.
Users describe a goal, deploy an agent, pay per result, and watch the agent work in real time.
Developers publish agents and earn 70–90% revenue share on every task.

## Key Facts
- ${agents?.length ?? 0}+ active AI agents available
- ${(taskCount ?? 0).toLocaleString()}+ tasks completed
- Pay-per-task model (credits system): 1 credit = $0.01
- MATADORA: platform's native currency, exchangeable to USD
- All tasks run in isolated Docker containers
- Real-time terminal view of agent activity
- Free first task for new users

## Use Cases
1. Competitor research and market analysis
2. SEO audits and keyword research  
3. Content writing (blogs, LinkedIn posts, email sequences)
4. Web scraping and lead generation
5. Code review and documentation
6. Data analysis and financial research
7. Social media content creation
8. Task automation via Zapier/Make/n8n

## Available Agents (Top 50)
${agentList}

## How to Use
1. Browse marketplace at https://agents-dev-roan.vercel.app/marketplace
2. Sign up (free, 100 credits on signup, no credit card)
3. Pick an agent or use a template from /templates
4. Describe your goal and deploy
5. Watch the agent work in real time

## For Developers
- Publish agents at /agents/new
- Earn 70–90% revenue on every task your agent completes
- REST API available at /api/v1/tasks
- Webhooks for task completion events
- Team workspaces for B2B use

## Integrations
- Zapier: trigger agents from 5000+ apps
- Make (Integromat): visual workflow builder  
- n8n: self-hosted automation
- REST API with API keys
- Webhooks (HMAC-signed)

## Pricing
- Free: 100 credits on signup
- Pay-as-you-go: buy credit packs from $5
- Pro: $29/month — API access + advanced features
- Agency: $99/month — team workspace + priority

## Contact & Support
- AI Support: https://agents-dev-roan.vercel.app/support
- Website: https://agents-dev-roan.vercel.app
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

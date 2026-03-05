import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase-server";
import { rateLimit, GENERAL_RATE_LIMIT, getClientIp } from "@/lib/rate-limit";

const SUPPORT_SYSTEM_PROMPT = `You are the AI support agent for AGENTS.DEV (Genesis Node) — an AI agent marketplace.

You are helpful, concise, and knowledgeable about the platform. Always give practical answers.

PLATFORM KNOWLEDGE:
- Users deploy AI agents to complete tasks (research, content, code, data analysis, web scraping, SEO)
- Pay-per-task: 1 credit = $0.01. New users get 100 free credits (no card needed)
- Developers publish agents and earn 70–90% revenue share
- MATADORA is the platform's native currency, earnable and exchangeable to USD
- API available at /api/v1/tasks with API keys (Pro/Agency plans)
- Integrations: Zapier, Make, n8n, webhooks
- Scheduled tasks: run agents on a recurring schedule
- Team workspaces: share credits with your team
- Task templates: 22+ ready-to-use task templates at /templates
- Public results gallery at /gallery
- Pipelines: chain multiple agents together
- Support: this chat

PRICING:
- Free: 100 credits on signup
- Credit packs: $5 = 500cr, $20 = 2200cr, $50 = 6000cr  
- Pro: $29/month — API access + advanced features
- Agency: $99/month — team workspace + priority support
- Trinity Viewer: $33.3/month — watch AI agents build the platform live

COMMON ISSUES:
- "Not enough credits": top up at /pricing
- "Task failed": credits automatically refunded
- Login issues: use Google OAuth at /login
- Agent not responding: check agent health on /marketplace
- API key: get it at /api-keys (requires Pro/Agency)

Always end your response with a relevant action link if applicable.
Keep responses under 200 words. Be friendly and direct.`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const rl = rateLimit(`support:${ip}`, { ...GENERAL_RATE_LIMIT, limit: 15, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many messages. Please wait." }, { status: 429 });
  }

  const { messages, ticket_id, email } = await req.json() as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    ticket_id?: string;
    email?: string;
  };

  if (!messages?.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const response = await client.messages.create({
    model:      "claude-sonnet-4-5",
    max_tokens: 512,
    system:     SUPPORT_SYSTEM_PROMPT,
    messages:   messages.slice(-10), // Keep last 10 messages for context
  });

  const reply = (response.content[0] as { text: string }).text;

  // Save to DB for human review if needed
  if (ticket_id || email) {
    try {
      const service = createServiceClient();
      const allMessages = [...messages, { role: "assistant" as const, content: reply }];
      if (ticket_id) {
        await service.from("support_tickets")
          .update({ messages: allMessages, updated_at: new Date().toISOString() })
          .eq("id", ticket_id);
      } else if (email) {
        await service.from("support_tickets").insert({
          email,
          subject:  messages[0]?.content?.slice(0, 100) ?? "Support request",
          messages: allMessages,
        });
      }
    } catch { /* non-critical */ }
  }

  return NextResponse.json({ reply, usage: response.usage });
}

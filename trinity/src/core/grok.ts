/**
 * CLAUDE (Sonnet) CLIENT — Core intelligence engine for Trinity agents
 * Replaces Grok-3 with Claude claude-sonnet-4-5 via Anthropic SDK
 * Supports: tool calls, long context, memory injection, agentic loops
 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ── Types (kept for backward compatibility with all agents) ────────────────

export type AgentName = "VASYLIY" | "HRYHORIY" | "IOANN";

export interface GrokMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface GrokTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GrokResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  usage: { promptTokens: number; completionTokens: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toAnthropicTools(tools: GrokTool[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool.InputSchema,
  }));
}

/**
 * Convert GrokMessage[] (OpenAI-style) to Anthropic MessageParam[]
 * - system messages are stripped (passed separately)
 * - tool messages are grouped into user messages with tool_result blocks
 */
function toAnthropicMessages(messages: GrokMessage[]): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];
  const nonSystem = messages.filter((m) => m.role !== "system");
  let i = 0;

  while (i < nonSystem.length) {
    const msg = nonSystem[i];

    if (msg.role === "tool") {
      // Collect all consecutive tool results → single user message
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      while (i < nonSystem.length && nonSystem[i].role === "tool") {
        toolResults.push({
          type: "tool_result",
          tool_use_id: nonSystem[i].tool_call_id!,
          content: nonSystem[i].content,
        });
        i++;
      }
      result.push({ role: "user", content: toolResults });
    } else {
      result.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
      i++;
    }
  }

  return result;
}

// ── Core API call ──────────────────────────────────────────────────────────

/**
 * Call Claude with full tool support and memory injection.
 * Drop-in replacement for the previous callGrok function.
 */
export async function callGrok(
  messages: GrokMessage[],
  tools: GrokTool[] = [],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<GrokResponse> {
  const systemMsg = messages.find((m) => m.role === "system");
  const anthropicMessages = toAnthropicMessages(messages);
  const anthropicTools = toAnthropicTools(tools);

  const response = await client.messages.create({
    model: MODEL,
    system: systemMsg?.content,
    messages: anthropicMessages,
    tools: anthropicTools.length > 0 ? anthropicTools : undefined,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.7,
  });

  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const toolCalls = response.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    .map((b) => ({
      id: b.id,
      name: b.name,
      args: b.input as Record<string, unknown>,
    }));

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    },
  };
}

// ── Agentic loop ───────────────────────────────────────────────────────────

/**
 * Agentic loop: call Claude → execute tools → call again until done
 * Max 12 iterations (Rule of Three × 4)
 * Uses Anthropic native message format internally for correctness
 */
export async function agenticLoop(
  systemPrompt: string,
  userMessage: string,
  tools: GrokTool[],
  toolExecutor: (name: string, args: Record<string, unknown>) => Promise<string>,
  memoryContext: string = "",
  maxIterations = 12,
): Promise<string> {
  const fullSystem = systemPrompt + (memoryContext ? `\n\n## MEMORY\n${memoryContext}` : "");
  const anthropicTools = toAnthropicTools(tools);

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    const response = await client.messages.create({
      model: MODEL,
      system: fullSystem,
      messages,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      max_tokens: 4096,
      temperature: 0.6,
    });

    // Append assistant turn to conversation
    messages.push({ role: "assistant", content: response.content });

    // If done — return final text
    if (
      response.stop_reason === "end_turn" ||
      !response.content.some((b) => b.type === "tool_use")
    ) {
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
    }

    // Execute each tool call and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "tool_use") {
        const tb = block as Anthropic.ToolUseBlock;
        let result: string;
        try {
          result = await toolExecutor(tb.name, tb.input as Record<string, unknown>);
        } catch (err) {
          result = `ERROR: ${String(err)}`;
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: tb.id,
          content: result,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  return `[Max iterations (${maxIterations}) reached]`;
}

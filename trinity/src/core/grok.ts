/**
 * GROK 3 CLIENT — Core intelligence engine for Trinity agents
 * Supports: streaming, tool calls, long context, memory injection
 */

import OpenAI from "openai";

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

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY!,
  baseURL: "https://api.x.ai/v1",
});

/**
 * Call Grok 3 with full tool support and memory injection
 */
export async function callGrok(
  messages: GrokMessage[],
  tools: GrokTool[] = [],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<GrokResponse> {
  const openaiTools = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const response = await client.chat.completions.create({
    model: "grok-3-latest",
    messages: messages as OpenAI.ChatCompletionMessageParam[],
    tools: openaiTools.length > 0 ? openaiTools : undefined,
    tool_choice: openaiTools.length > 0 ? "auto" : undefined,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4096,
  });

  const choice = response.choices[0];
  const msg = choice.message;

  const toolCalls = msg.tool_calls?.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
  }));

  return {
    content: msg.content ?? "",
    toolCalls,
    usage: {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}

/**
 * Agentic loop: call Grok → execute tools → call again until done
 * Max 12 iterations (Rule of Three × 4)
 */
export async function agenticLoop(
  systemPrompt: string,
  userMessage: string,
  tools: GrokTool[],
  toolExecutor: (name: string, args: Record<string, unknown>) => Promise<string>,
  memoryContext: string = "",
  maxIterations = 12,
): Promise<string> {
  const messages: GrokMessage[] = [
    { role: "system", content: systemPrompt + (memoryContext ? `\n\n## MEMORY\n${memoryContext}` : "") },
    { role: "user", content: userMessage },
  ];

  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    const response = await callGrok(messages, tools, { temperature: 0.6 });

    // No tool calls — agent finished
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return response.content;
    }

    // Add assistant message with tool calls
    messages.push({
      role: "assistant",
      content: response.content || "",
    });

    // Execute each tool call
    for (const tc of response.toolCalls) {
      let result: string;
      try {
        result = await toolExecutor(tc.name, tc.args);
      } catch (err) {
        result = `ERROR: ${String(err)}`;
      }
      messages.push({
        role: "tool",
        content: result,
        tool_call_id: tc.id,
        name: tc.name,
      });
    }
  }

  return `[Max iterations (${maxIterations}) reached]`;
}

/**
 * LLM CLIENT — Core intelligence engine for Trinity agents
 * Supports: Ollama (free) or Claude/Anthropic (paid)
 * When OLLAMA_URL is set → uses local Ollama (no API costs)
 * Otherwise → uses Anthropic Claude
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const USE_OLLAMA = !!process.env.OLLAMA_URL;
const raw = (process.env.OLLAMA_URL ?? "").replace(/\/$/, "");
const OLLAMA_BASE = raw.endsWith("/v1") ? raw : `${raw}/v1`;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:0.5b";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5";

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openaiClient = USE_OLLAMA
  ? new OpenAI({ apiKey: "ollama", baseURL: OLLAMA_BASE })
  : null;

// ── Types ───────────────────────────────────────────────────────────────────

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
  toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>;
  usage: { promptTokens: number; completionTokens: number };
}

// ── Ollama (OpenAI-compatible) ──────────────────────────────────────────────

async function callOllama(
  messages: GrokMessage[],
  tools: GrokTool[],
  opts: { temperature?: number; maxTokens?: number },
): Promise<GrokResponse> {
  if (!openaiClient) throw new Error("Ollama client not initialized");

  const openaiMessages = messages.map((m) => {
    if (m.role === "tool") {
      return { role: "tool" as const, content: m.content, tool_call_id: m.tool_call_id! };
    }
    return { role: m.role, content: m.content } as const;
  });

  const openaiTools = tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const res = await openaiClient.chat.completions.create({
    model: OLLAMA_MODEL,
    messages: openaiMessages as OpenAI.ChatCompletionMessageParam[],
    tools: openaiTools.length > 0 ? openaiTools : undefined,
    tool_choice: openaiTools.length > 0 ? "auto" : undefined,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4096,
  });

  const msg = res.choices[0]?.message;
  const content = msg?.content ?? "";
  const toolCalls = msg?.tool_calls?.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    args: JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>,
  }));

  return {
    content,
    toolCalls,
    usage: {
      promptTokens: res.usage?.prompt_tokens ?? 0,
      completionTokens: res.usage?.completion_tokens ?? 0,
    },
  };
}

async function ollamaAgenticLoop(
  systemPrompt: string,
  userMessage: string,
  tools: GrokTool[],
  toolExecutor: (name: string, args: Record<string, unknown>) => Promise<string>,
  memoryContext: string,
  maxIterations: number,
): Promise<string> {
  if (!openaiClient) throw new Error("Ollama client not initialized");

  const messages: GrokMessage[] = [
    { role: "system", content: systemPrompt + (memoryContext ? `\n\n## MEMORY\n${memoryContext}` : "") },
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < maxIterations; i++) {
    const res = await callOllama(messages, tools, { temperature: 0.6 });

    if (!res.toolCalls || res.toolCalls.length === 0) return res.content;

    messages.push({ role: "assistant", content: res.content });
    for (const tc of res.toolCalls) {
      let result: string;
      try {
        result = await toolExecutor(tc.name, tc.args);
      } catch (err) {
        result = `ERROR: ${String(err)}`;
      }
      messages.push({ role: "tool", content: result, tool_call_id: tc.id, name: tc.name });
    }
  }
  return `[Max iterations (${maxIterations}) reached]`;
}

// ── Anthropic Claude ───────────────────────────────────────────────────────

function toAnthropicTools(tools: GrokTool[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool.InputSchema,
  }));
}

function toAnthropicMessages(messages: GrokMessage[]): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];
  const nonSystem = messages.filter((m) => m.role !== "system");
  let i = 0;
  while (i < nonSystem.length) {
    const msg = nonSystem[i];
    if (msg.role === "tool") {
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
      result.push({ role: msg.role as "user" | "assistant", content: msg.content });
      i++;
    }
  }
  return result;
}

async function callClaude(
  messages: GrokMessage[],
  tools: GrokTool[],
  opts: { temperature?: number; maxTokens?: number },
): Promise<GrokResponse> {
  const systemMsg = messages.find((m) => m.role === "system");
  const response = await anthropicClient.messages.create({
    model: CLAUDE_MODEL,
    system: systemMsg?.content,
    messages: toAnthropicMessages(messages),
    tools: tools.length > 0 ? toAnthropicTools(tools) : undefined,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.7,
  });

  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const toolCalls = response.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    .map((b) => ({ id: b.id, name: b.name, args: b.input as Record<string, unknown> }));

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    },
  };
}

async function claudeAgenticLoop(
  systemPrompt: string,
  userMessage: string,
  tools: GrokTool[],
  toolExecutor: (name: string, args: Record<string, unknown>) => Promise<string>,
  memoryContext: string,
  maxIterations: number,
): Promise<string> {
  const fullSystem = systemPrompt + (memoryContext ? `\n\n## MEMORY\n${memoryContext}` : "");
  const anthropicTools = toAnthropicTools(tools);
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];

  for (let i = 0; i < maxIterations; i++) {
    const response = await anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      system: fullSystem,
      messages,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      max_tokens: 4096,
      temperature: 0.6,
    });

    messages.push({ role: "assistant", content: response.content });

    if (
      response.stop_reason === "end_turn" ||
      !response.content.some((b) => b.type === "tool_use")
    ) {
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
    }

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
        toolResults.push({ type: "tool_result", tool_use_id: tb.id, content: result });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }
  return `[Max iterations (${maxIterations}) reached]`;
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function callGrok(
  messages: GrokMessage[],
  tools: GrokTool[] = [],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<GrokResponse> {
  return USE_OLLAMA ? callOllama(messages, tools, opts) : callClaude(messages, tools, opts);
}

export async function agenticLoop(
  systemPrompt: string,
  userMessage: string,
  tools: GrokTool[],
  toolExecutor: (name: string, args: Record<string, unknown>) => Promise<string>,
  memoryContext: string = "",
  maxIterations = 12,
): Promise<string> {
  return USE_OLLAMA
    ? ollamaAgenticLoop(systemPrompt, userMessage, tools, toolExecutor, memoryContext, maxIterations)
    : claudeAgenticLoop(systemPrompt, userMessage, tools, toolExecutor, memoryContext, maxIterations);
}

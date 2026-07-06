import Anthropic from "@anthropic-ai/sdk";

import type { Challenge } from "./challenge";
import { runChallenge, type RunResult } from "./runner";

export interface LoadoutConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  /** Turn budget: how many times the agent may call test_solution before we stop. */
  maxIterations?: number;
}

export interface TranscriptEntry {
  iteration: number;
  passed: boolean;
  summary: string;
  /** Any text the model wrote alongside the tool call (its stated reasoning), if it wrote any. */
  reasoning: string;
  /** What it actually submitted, so a live viewer can show the attempt, not just pass/fail. */
  submittedContent: string;
}

export interface AgentLoopResult {
  finalResult: RunResult;
  iterations: number;
  transcript: TranscriptEntry[];
}

/** Minimal surface of the Anthropic client this module needs — lets tests inject a mock. */
export interface MessagesClient {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

const TEST_SOLUTION_TOOL: Anthropic.Tool = {
  name: "test_solution",
  description:
    "Submit your current attempt at the solution file and run the real grading tests against it in a " +
    "sandbox. Returns whether the tests passed and their output. Call this again with a revised solution " +
    "if the tests failed — you can see exactly why they failed and fix it.",
  input_schema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The complete, corrected content of the solution file.",
      },
    },
    required: ["content"],
  },
};

const DEFAULT_MODEL = "claude-sonnet-4-5";
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_ITERATIONS = 5;

function buildInitialPrompt(challenge: Challenge, maxIterations: number): string {
  const currentContent = challenge.files[challenge.solutionFile] ?? "";
  const supportingFiles = Object.entries(challenge.files)
    .filter(([path]) => path !== challenge.solutionFile)
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join("\n\n");

  return (
    `${challenge.prompt}\n\n` +
    `--- ${challenge.solutionFile} (current, buggy content) ---\n${currentContent}\n\n` +
    (supportingFiles ? `${supportingFiles}\n\n` : "") +
    `Use the test_solution tool to try a fix and see the real test results. You have up to ` +
    `${maxIterations} attempts. Stop calling the tool once the tests pass.`
  );
}

function isToolUseBlock(block: Anthropic.ContentBlock): block is Anthropic.ToolUseBlock {
  return block.type === "tool_use";
}

function isTextBlock(block: Anthropic.ContentBlock): block is Anthropic.TextBlock {
  return block.type === "text";
}

function extractReasoning(content: Anthropic.ContentBlock[]): string {
  return content.filter(isTextBlock).map((block) => block.text).join("\n").trim();
}

/**
 * Iteratively: ask the model for a solution via the `test_solution` tool, grade
 * it for real in the sandbox, feed the actual test output back, repeat — up to
 * `maxIterations` calls to the tool. This is what makes it an *agent* rather
 * than a single guess: it can see why it failed and try again.
 *
 * `client` is injectable so the loop logic is fully testable with a mock that
 * simulates tool-use responses, without needing a real API key.
 *
 * `onIteration`, if given, fires synchronously right after each attempt is
 * graded — before the loop decides whether to continue — so a caller (e.g. an
 * SSE route) can stream progress live instead of waiting for the whole loop
 * to finish.
 */
export async function runAgentLoop(
  challenge: Challenge,
  loadout: LoadoutConfig,
  client: MessagesClient = new Anthropic({ apiKey: loadout.apiKey }),
  onIteration?: (entry: TranscriptEntry) => void
): Promise<AgentLoopResult> {
  const model = loadout.model ?? DEFAULT_MODEL;
  const maxTokens = loadout.maxTokens ?? DEFAULT_MAX_TOKENS;
  const maxIterations = loadout.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildInitialPrompt(challenge, maxIterations) },
  ];

  let lastResult: RunResult | null = null;
  const transcript: TranscriptEntry[] = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    const response = await client.messages.create({ model, max_tokens: maxTokens, tools: [TEST_SOLUTION_TOOL], messages });

    const toolUse = response.content.find(isToolUseBlock);
    if (!toolUse) {
      break; // model gave a final answer without testing again — nothing left to grade
    }

    iterations += 1;
    const input = toolUse.input as { content?: string };
    const submittedContent = input.content ?? "";
    lastResult = await runChallenge(challenge, submittedContent);

    const entry: TranscriptEntry = {
      iteration: iterations,
      passed: lastResult.passed,
      summary: lastResult.passed ? "tests passed" : "tests failed",
      reasoning: extractReasoning(response.content),
      submittedContent,
    };
    transcript.push(entry);
    onIteration?.(entry);

    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUse.id,
          is_error: !lastResult.passed,
          content: lastResult.passed
            ? "Tests passed. You may stop here."
            : `Tests failed.\n${lastResult.stdout}\n${lastResult.stderr}`.slice(0, 4000),
        },
      ],
    });

    if (lastResult.passed) break;
  }

  // The model never called the tool at all (e.g. refused, or answered in prose) —
  // grade the unmodified starter file so callers still get a real result, not a crash.
  lastResult ??= await runChallenge(challenge, challenge.files[challenge.solutionFile] ?? "");

  return { finalResult: lastResult, iterations, transcript };
}

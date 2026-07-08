import Anthropic from "@anthropic-ai/sdk";

import { editableFiles, type Challenge } from "./challenge";
import { runChallenge, type RunResult } from "./runner";

export interface LoadoutConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  /** Turn budget: how many times the agent may call test_solution before we stop. */
  maxIterations?: number;
  /**
   * Optional player-authored guidance on *how* to attack the bug, handed to the
   * agent as its system prompt. This is what turns the loadout from "pick a
   * model" into a game of skill — the player is coaching the agent. Bounded by
   * lib/loadouts.ts so it stays guidance, not a pasted answer.
   */
  strategy?: string;
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

/**
 * The `test_solution` tool, shaped to the challenge. A single-file challenge
 * keeps the simple `{ content }` schema (unchanged from the original loop); a
 * multi-file challenge instead takes `{ files: { <path>: <content> } }` keyed
 * by the editable files, so the model can patch across modules in one attempt.
 */
function buildTestSolutionTool(editable: string[]): Anthropic.Tool {
  if (editable.length === 1) {
    return {
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
  }

  const fileProperties: Record<string, { type: "string"; description: string }> = {};
  for (const path of editable) {
    fileProperties[path] = {
      type: "string",
      description: `Complete corrected content of ${path}.`,
    };
  }

  return {
    name: "test_solution",
    description:
      "Submit your current attempt and run the real grading tests in a sandbox. This challenge spans " +
      "multiple editable files — put each file you have changed in `files`, keyed by its path. Every call is " +
      "graded fresh from the original starter files, so include ALL the files you have changed (not just the " +
      "most recent one). Returns whether the tests passed and their output; call again with revisions if they " +
      "failed. You cannot edit the test file — only the files listed here.",
    input_schema: {
      type: "object",
      properties: {
        files: {
          type: "object",
          properties: fileProperties,
          additionalProperties: false,
          description: "Map of editable file path -> its complete corrected content.",
        },
      },
      required: ["files"],
    },
  };
}

/**
 * Turn the model's `test_solution` input into (a) the edits to grade and (b) a
 * human-readable string of what was submitted, for the live transcript. For a
 * single-file challenge the submitted string is just the file content (so the
 * transcript is unchanged from the original loop); for multi-file it's the
 * edited files concatenated with path headers. Only editable paths are kept —
 * anything else the model puts in `files` is dropped before grading.
 */
function parseSubmission(
  editable: string[],
  input: unknown
): { edits: Record<string, string>; submitted: string } {
  const obj = (input ?? {}) as { content?: string; files?: Record<string, string> };

  if (editable.length === 1) {
    const content = obj.content ?? "";
    return { edits: { [editable[0]!]: content }, submitted: content };
  }

  const provided = obj.files ?? {};
  const edits: Record<string, string> = {};
  for (const path of editable) {
    if (typeof provided[path] === "string") edits[path] = provided[path]!;
  }
  const submitted = Object.entries(edits)
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join("\n\n");
  return { edits, submitted };
}

// Fallback for direct lib callers/tests only — the API routes always pass a
// model validated against lib/loadouts.ts. Kept in sync with that catalog's
// DEFAULT_MODEL, but not imported so this module stays standalone.
const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_ITERATIONS = 5;

function buildInitialPrompt(challenge: Challenge, maxIterations: number): string {
  const editable = new Set(editableFiles(challenge));

  const editableBlocks = editableFiles(challenge)
    .map((path) => `--- ${path} (current, buggy content — you may edit this) ---\n${challenge.files[path] ?? ""}`)
    .join("\n\n");

  const supportingFiles = Object.entries(challenge.files)
    .filter(([path]) => !editable.has(path))
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join("\n\n");

  return (
    `${challenge.prompt}\n\n` +
    `${editableBlocks}\n\n` +
    (supportingFiles ? `${supportingFiles}\n\n` : "") +
    `Use the test_solution tool to try a fix and see the real test results. You have up to ` +
    `${maxIterations} attempts. Stop calling the tool once the tests pass.`
  );
}

/**
 * Wrap a player's strategy into the agent's system prompt. Frames it as
 * coaching ("how to work, not the answer") so the model treats it as method
 * rather than a solution to echo — the honest counterpart to the length cap in
 * lib/loadouts.ts.
 */
function buildStrategySystem(strategy: string): string {
  return (
    "You are an expert debugging agent competing in Agent Arena. A player has given you a " +
    "strategy to follow — apply it as you diagnose and fix the code. It is guidance on how to " +
    "work, not the answer itself.\n\n" +
    `Player strategy:\n${strategy}`
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

  const editable = editableFiles(challenge);
  const tool = buildTestSolutionTool(editable);
  const system = loadout.strategy ? buildStrategySystem(loadout.strategy) : undefined;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildInitialPrompt(challenge, maxIterations) },
  ];

  let lastResult: RunResult | null = null;
  const transcript: TranscriptEntry[] = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      tools: [tool],
      messages,
    });

    const toolUse = response.content.find(isToolUseBlock);
    if (!toolUse) {
      break; // model gave a final answer without testing again — nothing left to grade
    }

    iterations += 1;
    const { edits, submitted } = parseSubmission(editable, toolUse.input);
    lastResult = await runChallenge(challenge, edits);

    const entry: TranscriptEntry = {
      iteration: iterations,
      passed: lastResult.passed,
      summary: lastResult.passed ? "tests passed" : "tests failed",
      reasoning: extractReasoning(response.content),
      submittedContent: submitted,
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

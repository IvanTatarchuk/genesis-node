import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import { sumRangeChallenge } from "../challenges/sum-range";
import { runAgentLoop, type MessagesClient } from "../lib/agentLoop";

const BUGGY = sumRangeChallenge.files["sum.js"]!;
const FIXED = [
  "function sumRange(n) {",
  "  let total = 0;",
  "  for (let i = 1; i <= n; i++) {",
  "    total += i;",
  "  }",
  "  return total;",
  "}",
  "",
  "module.exports = { sumRange };",
  "",
].join("\n");

function toolUseResponse(id: string, content: string): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-5",
    content: [{ type: "tool_use", id, name: "test_solution", input: { content } }],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as Anthropic.Message;
}

function textResponse(text: string): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-5",
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}

describe("runAgentLoop", () => {
  it("iterates: fails once, then submits a fix that passes", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(toolUseResponse("call_1", BUGGY))
      .mockResolvedValueOnce(toolUseResponse("call_2", FIXED));
    const client: MessagesClient = { messages: { create } };

    const result = await runAgentLoop(sumRangeChallenge, { apiKey: "unused" }, client);

    expect(result.iterations).toBe(2);
    expect(result.finalResult.passed).toBe(true);
    expect(result.transcript).toEqual([
      { iteration: 1, passed: false, summary: "tests failed" },
      { iteration: 2, passed: true, summary: "tests passed" },
    ]);
    expect(create).toHaveBeenCalledTimes(2);
  }, 15_000);

  it("stops at the turn budget without ever passing", async () => {
    const create = vi.fn().mockResolvedValue(toolUseResponse("call_n", BUGGY));
    const client: MessagesClient = { messages: { create } };

    const result = await runAgentLoop(sumRangeChallenge, { apiKey: "unused", maxIterations: 3 }, client);

    expect(result.iterations).toBe(3);
    expect(result.finalResult.passed).toBe(false);
    expect(create).toHaveBeenCalledTimes(3);
  }, 15_000);

  it("grades the unmodified starter file if the model never calls the tool", async () => {
    const create = vi.fn().mockResolvedValue(textResponse("I don't think I can help with this."));
    const client: MessagesClient = { messages: { create } };

    const result = await runAgentLoop(sumRangeChallenge, { apiKey: "unused" }, client);

    expect(result.iterations).toBe(0);
    expect(result.finalResult.passed).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
  }, 15_000);

  it("stops iterating as soon as a submission passes, even with budget remaining", async () => {
    const create = vi.fn().mockResolvedValueOnce(toolUseResponse("call_1", FIXED));
    const client: MessagesClient = { messages: { create } };

    const result = await runAgentLoop(sumRangeChallenge, { apiKey: "unused", maxIterations: 5 }, client);

    expect(result.iterations).toBe(1);
    expect(result.finalResult.passed).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  }, 15_000);
});

import Anthropic from "@anthropic-ai/sdk";

import type { Challenge } from "./challenge";

export interface LoadoutConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

const DEFAULT_MODEL = "claude-sonnet-4-5";
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Ask the model to produce the corrected content of `challenge.solutionFile`.
 * Single-shot for this first slice — no tool use, no multi-turn iteration
 * (that's the natural next step once this loop is proven end-to-end).
 */
export async function generateSolution(challenge: Challenge, loadout: LoadoutConfig): Promise<string> {
  const client = new Anthropic({ apiKey: loadout.apiKey });

  const currentContent = challenge.files[challenge.solutionFile] ?? "";
  const supportingFiles = Object.entries(challenge.files)
    .filter(([path]) => path !== challenge.solutionFile)
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join("\n\n");

  const message = await client.messages.create({
    model: loadout.model ?? DEFAULT_MODEL,
    max_tokens: loadout.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: [
      {
        role: "user",
        content:
          `${challenge.prompt}\n\n` +
          `--- ${challenge.solutionFile} (current, buggy content) ---\n${currentContent}\n\n` +
          (supportingFiles ? `${supportingFiles}\n\n` : "") +
          `Respond with ONLY the full corrected content of ${challenge.solutionFile}.`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("model response contained no text content");
  }

  return stripMarkdownFence(textBlock.text);
}

/**
 * Models are told not to wrap the response in a markdown code fence, but
 * asking nicely isn't a guarantee — strip one if present rather than let it
 * corrupt the submitted file.
 */
export function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/.exec(trimmed);
  return fenceMatch ? fenceMatch[1]! : trimmed;
}

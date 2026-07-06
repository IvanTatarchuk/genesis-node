import { describe, expect, it } from "vitest";

import { stripMarkdownFence } from "../lib/agent";

describe("stripMarkdownFence", () => {
  it("returns plain text unchanged", () => {
    expect(stripMarkdownFence("function f() {}\n")).toBe("function f() {}");
  });

  it("strips a fenced code block with a language tag", () => {
    const fenced = "```javascript\nfunction f() {}\n```";
    expect(stripMarkdownFence(fenced)).toBe("function f() {}");
  });

  it("strips a fenced code block with no language tag", () => {
    const fenced = "```\nfunction f() {}\n```";
    expect(stripMarkdownFence(fenced)).toBe("function f() {}");
  });

  it("leaves inline triple-backtick text alone if it isn't a full wrapping fence", () => {
    const text = "some ```inline``` text";
    expect(stripMarkdownFence(text)).toBe(text);
  });
});

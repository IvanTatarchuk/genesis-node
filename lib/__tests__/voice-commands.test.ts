import { describe, it, expect } from "vitest";
import { matchVoiceCommand, getVoiceCommandHints } from "../voice-commands";
import type { VoiceAction } from "../voice-commands";

describe("matchVoiceCommand", () => {
  it("returns null for empty string", () => {
    expect(matchVoiceCommand("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(matchVoiceCommand("   ")).toBeNull();
  });

  it("returns null for unrecognized phrases", () => {
    expect(matchVoiceCommand("fly me to the moon")).toBeNull();
  });

  // ── Exact matches ────────────────────────────────────────────────────────────

  it('matches "home" to /', () => {
    const result = matchVoiceCommand("home");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/" });
  });

  it('matches "marketplace" to /marketplace', () => {
    const result = matchVoiceCommand("marketplace");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/marketplace" });
  });

  it('matches "voice" to /voice', () => {
    const result = matchVoiceCommand("voice");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/voice" });
  });

  it('matches "pricing" to /pricing', () => {
    const result = matchVoiceCommand("pricing");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/pricing" });
  });

  it('matches "dashboard" to /dashboard', () => {
    const result = matchVoiceCommand("dashboard");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/dashboard" });
  });

  it('matches "leaderboard" to /leaderboard', () => {
    const result = matchVoiceCommand("leaderboard");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/leaderboard" });
  });

  it('matches "login" to /login', () => {
    const result = matchVoiceCommand("login");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/login" });
  });

  it('matches "templates" to /templates', () => {
    const result = matchVoiceCommand("templates");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/templates" });
  });

  it('matches "gallery" to /gallery', () => {
    const result = matchVoiceCommand("gallery");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/gallery" });
  });

  it('matches "support" to /support', () => {
    const result = matchVoiceCommand("support");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/support" });
  });

  it('matches "faq" to /faq', () => {
    const result = matchVoiceCommand("faq");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/faq" });
  });

  it('matches "status" to /status', () => {
    const result = matchVoiceCommand("status");
    expect(result).toEqual<VoiceAction>({ type: "navigate", path: "/status" });
  });

  it('matches "live demo" as a scroll action', () => {
    const result = matchVoiceCommand("live demo");
    expect(result).toEqual<VoiceAction>({ type: "scroll", id: "live-demo" });
  });

  // ── Case insensitivity ───────────────────────────────────────────────────────

  it("is case-insensitive", () => {
    expect(matchVoiceCommand("MARKETPLACE")).toEqual({ type: "navigate", path: "/marketplace" });
    expect(matchVoiceCommand("Go To Dashboard")).toEqual({ type: "navigate", path: "/dashboard" });
  });

  // ── Alias phrases ────────────────────────────────────────────────────────────

  it('matches alias "go home"', () => {
    expect(matchVoiceCommand("go home")).toEqual({ type: "navigate", path: "/" });
  });

  it('matches alias "browse agents"', () => {
    expect(matchVoiceCommand("browse agents")).toEqual({ type: "navigate", path: "/marketplace" });
  });

  it('matches alias "sign in"', () => {
    expect(matchVoiceCommand("sign in")).toEqual({ type: "navigate", path: "/login" });
  });

  it('matches alias "sell agent"', () => {
    expect(matchVoiceCommand("sell agent")).toEqual({ type: "navigate", path: "/become-developer" });
  });

  it('matches alias "api keys"', () => {
    expect(matchVoiceCommand("api keys")).toEqual({ type: "navigate", path: "/api-keys" });
  });

  it('matches alias "why genesis"', () => {
    expect(matchVoiceCommand("why genesis")).toEqual({ type: "navigate", path: "/compare" });
  });

  // ── Substring matching ───────────────────────────────────────────────────────

  it("matches when the transcript contains the phrase", () => {
    // "go to marketplace" contains "marketplace"
    expect(matchVoiceCommand("please go to marketplace now")).toEqual({
      type: "navigate",
      path: "/marketplace",
    });
  });

  // ── Punctuation stripping ────────────────────────────────────────────────────

  it("strips punctuation before matching", () => {
    expect(matchVoiceCommand("home!")).toEqual({ type: "navigate", path: "/" });
    expect(matchVoiceCommand("go to pricing?")).toEqual({ type: "navigate", path: "/pricing" });
  });

  // ── Extra whitespace handling ────────────────────────────────────────────────

  it("normalizes extra whitespace", () => {
    expect(matchVoiceCommand("  go   home  ")).toEqual({ type: "navigate", path: "/" });
  });
});

describe("getVoiceCommandHints", () => {
  it("returns an array of strings", () => {
    const hints = getVoiceCommandHints();
    expect(Array.isArray(hints)).toBe(true);
    expect(hints.length).toBeGreaterThan(0);
    hints.forEach((h) => expect(typeof h).toBe("string"));
  });

  it("includes one hint per command group", () => {
    const hints = getVoiceCommandHints();
    // There are 16 command groups in the source
    expect(hints).toHaveLength(16);
  });

  it("returns the first phrase of each command group", () => {
    const hints = getVoiceCommandHints();
    expect(hints).toContain("home");
    expect(hints).toContain("marketplace");
    expect(hints).toContain("voice");
    expect(hints).toContain("pricing");
    expect(hints).toContain("dashboard");
    expect(hints).toContain("leaderboard");
  });
});

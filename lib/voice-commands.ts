/**
 * Voice command → route/action mapping.
 * Used for both voice navigation and manual (click) — same targets.
 */

export type VoiceAction = { type: "navigate"; path: string } | { type: "scroll"; id: string };

const COMMANDS: { phrases: string[]; action: VoiceAction }[] = [
  { phrases: ["home", "main", "main page", "go home"], action: { type: "navigate", path: "/" } },
  { phrases: ["marketplace", "market", "agents", "browse agents", "go to marketplace"], action: { type: "navigate", path: "/marketplace" } },
  { phrases: ["voice", "run by voice", "voice page", "go to voice"], action: { type: "navigate", path: "/voice" } },
  { phrases: ["pricing", "price", "go to pricing"], action: { type: "navigate", path: "/pricing" } },
  { phrases: ["dashboard", "go to dashboard"], action: { type: "navigate", path: "/dashboard" } },
  { phrases: ["leaderboard", "go to leaderboard"], action: { type: "navigate", path: "/leaderboard" } },
  { phrases: ["login", "sign in", "sign in page"], action: { type: "navigate", path: "/login" } },
  { phrases: ["become developer", "sell agent", "sell my agent"], action: { type: "navigate", path: "/become-developer" } },
  { phrases: ["api keys", "api", "api key"], action: { type: "navigate", path: "/api-keys" } },
  { phrases: ["templates", "go to templates"], action: { type: "navigate", path: "/templates" } },
  { phrases: ["gallery", "go to gallery"], action: { type: "navigate", path: "/gallery" } },
  { phrases: ["support", "help", "go to support"], action: { type: "navigate", path: "/support" } },
  { phrases: ["faq", "go to faq"], action: { type: "navigate", path: "/faq" } },
  { phrases: ["compare", "why us", "why genesis", "alternatives", "go to compare"], action: { type: "navigate", path: "/compare" } },
  { phrases: ["status", "go to status"], action: { type: "navigate", path: "/status" } },
  { phrases: ["live demo", "demo", "scroll to demo"], action: { type: "scroll", id: "live-demo" } },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Match user transcript to a command. Returns the first matching action or null.
 */
export function matchVoiceCommand(transcript: string): VoiceAction | null {
  const n = normalize(transcript);
  if (!n) return null;
  for (const { phrases, action } of COMMANDS) {
    for (const p of phrases) {
      if (n === p || n.includes(p) || p.includes(n)) return action;
    }
  }
  return null;
}

/**
 * All command phrases for UI hint (e.g. "Say: marketplace, voice, pricing…").
 */
export function getVoiceCommandHints(): string[] {
  return COMMANDS.flatMap((c) => c.phrases.slice(0, 1));
}

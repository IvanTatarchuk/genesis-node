/**
 * LONG-TERM MEMORY — Persistent agent memory in Supabase
 * Each agent has: short-term (last 33 messages), long-term (embeddings/summaries),
 * and shared knowledge base.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AgentName } from "./grok";

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_sb) {
    _sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  }
  return _sb;
}

export interface MemoryEntry {
  id: string;
  agent: AgentName;
  type: "observation" | "decision" | "report" | "error" | "knowledge";
  content: string;
  importance: number; // 1-10
  created_at: string;
  tags: string[];
}

export interface AgentState {
  agent: AgentName;
  last_run: string;
  last_report: string;
  cycle_count: number;
  health_score: number; // 0-100
  current_focus: string;
  metrics: Record<string, number>;
}

// ── Write memory ───────────────────────────────────────────────────────────────

export async function remember(
  agent: AgentName,
  type: MemoryEntry["type"],
  content: string,
  importance = 5,
  tags: string[] = [],
): Promise<void> {
  await sb().from("trinity_memory").insert({
    agent,
    type,
    content: content.slice(0, 8000), // cap at 8k chars
    importance,
    tags,
  });
}

// ── Read recent memories ───────────────────────────────────────────────────────

export async function recall(
  agent: AgentName,
  limit = 33,
  minImportance = 3,
): Promise<MemoryEntry[]> {
  const { data } = await sb()
    .from("trinity_memory")
    .select("*")
    .eq("agent", agent)
    .gte("importance", minImportance)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as MemoryEntry[];
}

// ── Read shared knowledge (all agents can see) ─────────────────────────────────

export async function recallShared(limit = 12): Promise<MemoryEntry[]> {
  const { data } = await sb()
    .from("trinity_memory")
    .select("*")
    .gte("importance", 7)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as MemoryEntry[];
}

// ── Format memory as context string ───────────────────────────────────────────

export async function buildMemoryContext(agent: AgentName): Promise<string> {
  const [own, shared] = await Promise.all([
    recall(agent, 20),
    recallShared(12),
  ]);

  const sections: string[] = [];

  if (own.length > 0) {
    sections.push(
      `### Власна пам'ять (${agent}):\n` +
      own.map((m) => `[${m.type.toUpperCase()} | важливість:${m.importance}] ${m.content}`).join("\n"),
    );
  }

  if (shared.length > 0) {
    sections.push(
      `### Спільна база знань платформи:\n` +
      shared.map((m) => `[${m.agent} | ${m.type}] ${m.content}`).join("\n"),
    );
  }

  return sections.join("\n\n");
}

// ── Agent state management ─────────────────────────────────────────────────────

export async function getAgentState(agent: AgentName): Promise<AgentState | null> {
  const { data } = await sb()
    .from("trinity_state")
    .select("*")
    .eq("agent", agent)
    .single();
  return data as AgentState | null;
}

export async function updateAgentState(
  agent: AgentName,
  updates: Partial<Omit<AgentState, "agent">>,
): Promise<void> {
  await sb()
    .from("trinity_state")
    .upsert({ agent, ...updates, updated_at: new Date().toISOString() });
}

// ── Cross-agent message bus ────────────────────────────────────────────────────

export async function postMessage(
  from: AgentName,
  to: AgentName | "ALL",
  content: string,
  priority: "low" | "medium" | "high" | "critical" = "medium",
): Promise<void> {
  await sb().from("trinity_messages").insert({
    from_agent: from,
    to_agent: to,
    content: content.slice(0, 4000),
    priority,
    is_read: false,
  });
}

export async function readMessages(
  agent: AgentName,
): Promise<Array<{ id: string; from_agent: AgentName; content: string; priority: string; created_at: string }>> {
  const { data } = await sb()
    .from("trinity_messages")
    .select("*")
    .or(`to_agent.eq.${agent},to_agent.eq.ALL`)
    .eq("is_read", false)
    .order("created_at", { ascending: true })
    .limit(33);

  // Mark as read
  if (data && data.length > 0) {
    const ids = data.map((m) => m.id);
    await sb().from("trinity_messages").update({ is_read: true }).in("id", ids);
  }

  return (data ?? []) as any[];
}

// ── Platform report storage ────────────────────────────────────────────────────

export async function saveReport(
  agent: AgentName,
  cycle: number,
  reportType: "technical" | "strategic" | "ux",
  content: string,
  metrics: Record<string, number> = {},
): Promise<void> {
  await sb().from("trinity_reports").insert({
    agent,
    cycle,
    report_type: reportType,
    content: content.slice(0, 16000),
    metrics,
  });

  // Store as high-importance memory
  await remember(agent, "report", content.slice(0, 2000), 8, ["report", reportType]);
}

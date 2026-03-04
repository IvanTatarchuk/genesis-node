/**
 * LONG-TERM MEMORY v3 — Maximum intelligence persistence
 * Each agent has: short-term (last 33 messages), long-term (importance-weighted),
 * shared knowledge base, cross-agent message bus, goal tracking, and learning logs.
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
  importance: number;
  created_at: string;
  tags: string[];
}

export interface AgentState {
  agent: AgentName;
  last_run: string;
  last_report: string;
  cycle_count: number;
  health_score: number;
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
  try {
    await (sb() as any).from("trinity_memory").insert({
      agent,
      type,
      content: content.slice(0, 8000),
      importance,
      tags,
    });
  } catch (err) {
    // Memory table might have different schema
    console.error(`[memory] remember error: ${err}`);
  }
}

// ── Read recent memories ───────────────────────────────────────────────────────

export async function recall(
  agent: AgentName,
  limit = 33,
  minImportance = 3,
): Promise<MemoryEntry[]> {
  try {
    const { data } = await (sb() as any)
      .from("trinity_memory")
      .select("*")
      .eq("agent", agent)
      .gte("importance", minImportance)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as MemoryEntry[];
  } catch {
    return [];
  }
}

// ── Read shared knowledge (all agents can see) ─────────────────────────────────

export async function recallShared(limit = 12): Promise<MemoryEntry[]> {
  try {
    const { data } = await (sb() as any)
      .from("trinity_memory")
      .select("*")
      .gte("importance", 7)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as MemoryEntry[];
  } catch {
    return [];
  }
}

// ── Read platform goals ────────────────────────────────────────────────────────

export async function recallGoals(): Promise<string> {
  try {
    const { data } = await (sb() as any)
      .from("trinity_memory")
      .select("content, agent, created_at")
      .ilike("content", "%PLATFORM GOAL%")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!data || data.length === 0) return "";
    return "\n### Current Platform Goals:\n" + (data ?? []).map((g: any) => `- ${g.content}`).join("\n");
  } catch {
    return "";
  }
}

// ── Read cross-agent insights (high-importance from all agents) ────────────────

export async function recallCrossAgentInsights(limit = 8): Promise<string> {
  try {
    const { data } = await (sb() as any)
      .from("trinity_memory")
      .select("agent, type, content, importance, created_at")
      .gte("importance", 8)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!data || data.length === 0) return "";
    return "\n### 🧠 Cross-Agent Intelligence:\n" +
      (data ?? []).map((m: any) => `[${m.agent}|${m.type}|${m.importance}/10] ${m.content.slice(0, 300)}`).join("\n");
  } catch {
    return "";
  }
}

// ── Format memory as rich context string ──────────────────────────────────────

export async function buildMemoryContext(agent: AgentName): Promise<string> {
  const [own, shared, goals, crossAgent] = await Promise.all([
    recall(agent, 25, 3),
    recallShared(10),
    recallGoals(),
    recallCrossAgentInsights(6),
  ]);

  const sections: string[] = [];
  const now = new Date();
  sections.push(`### Context: ${now.toISOString()} | Agent: ${agent}`);

  if (own.length > 0) {
    sections.push(
      `### Own Memory (${agent}) — last ${own.length} entries:\n` +
      own.map((m) => `[${m.type.toUpperCase()}|imp:${m.importance}] ${m.content.slice(0, 500)}`).join("\n"),
    );
  }

  if (shared.length > 0) {
    sections.push(
      `### Shared Platform Knowledge:\n` +
      shared.map((m) => `[${m.agent}|${m.type}] ${m.content.slice(0, 300)}`).join("\n"),
    );
  }

  if (goals) sections.push(goals);
  if (crossAgent) sections.push(crossAgent);

  return sections.join("\n\n");
}

// ── Agent state management ─────────────────────────────────────────────────────

export async function getAgentState(agent: AgentName): Promise<AgentState | null> {
  try {
    const { data } = await (sb() as any)
      .from("trinity_state")
      .select("*")
      .eq("agent", agent)
      .single();
    return data as AgentState | null;
  } catch {
    return null;
  }
}

export async function updateAgentState(
  agent: AgentName,
  updates: Partial<Omit<AgentState, "agent">>,
): Promise<void> {
  try {
    await (sb() as any)
      .from("trinity_state")
      .upsert({ agent, ...updates, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error(`[memory] updateAgentState error for ${agent}: ${err}`);
  }
}

// ── Cross-agent message bus ────────────────────────────────────────────────────

export async function postMessage(
  from: AgentName,
  to: AgentName | "ALL",
  content: string,
  priority: "low" | "medium" | "high" | "critical" = "medium",
): Promise<void> {
  try {
    await (sb() as any).from("trinity_messages").insert({
      from_agent: from,
      to_agent: to,
      content: content.slice(0, 4000),
      priority,
      is_read: false,
    });
  } catch (err) {
    console.error(`[memory] postMessage error: ${err}`);
  }
}

export async function readMessages(
  agent: AgentName,
): Promise<Array<{ id: string; from_agent: AgentName; content: string; priority: string; created_at: string }>> {
  try {
    const { data } = await (sb() as any)
      .from("trinity_messages")
      .select("*")
      .or(`to_agent.eq.${agent},to_agent.eq.ALL`)
      .eq("is_read", false)
      .order("created_at", { ascending: true })
      .limit(33);

    if (data && data.length > 0) {
      const ids = (data as any[]).map((m) => m.id);
      await (sb() as any).from("trinity_messages").update({ is_read: true }).in("id", ids);
    }

    return (data ?? []) as any[];
  } catch {
    return [];
  }
}

// ── Platform report storage ────────────────────────────────────────────────────

export async function saveReport(
  agent: AgentName,
  cycle: number,
  reportType: "technical" | "strategic" | "ux",
  content: string,
  metrics: Record<string, number> = {},
): Promise<void> {
  try {
    await (sb() as any).from("trinity_reports").insert({
      agent,
      cycle,
      report_type: reportType,
      content: content.slice(0, 16000),
      metrics,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Try alternate schema
    try {
      await (sb() as any).from("trinity_reports").insert({
        agent_name: agent,
        cycle,
        report_type: reportType,
        content: content.slice(0, 16000),
        created_at: new Date().toISOString(),
      });
    } catch (err2) {
      console.error(`[memory] saveReport error: ${err2}`);
    }
  }

  // Always store as high-importance memory
  await remember(agent, "report", content.slice(0, 2000), 8, ["report", reportType, `cycle_${cycle}`]);
}

// ── Knowledge pruning (auto-maintenance) ──────────────────────────────────────

export async function pruneOldMemories(agentName: AgentName, keepLast = 100): Promise<number> {
  try {
    // Get IDs of oldest low-importance memories beyond the keep threshold
    const { data } = await (sb() as any)
      .from("trinity_memory")
      .select("id, created_at, importance")
      .eq("agent", agentName)
      .lt("importance", 6)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!data || data.length < 20) return 0;

    const toDelete = (data as any[]).slice(0, 20).map((m) => m.id);
    await (sb() as any).from("trinity_memory").delete().in("id", toDelete);
    return toDelete.length;
  } catch {
    return 0;
  }
}

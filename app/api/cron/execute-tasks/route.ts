import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const maxDuration = 300;
export const runtime = "nodejs";

// LLM priority: OLLAMA_URL > XAI_API_KEY
const OLLAMA_URL  = process.env.OLLAMA_URL ?? "";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
const GROK_MODEL  = process.env.GROK_MODEL ?? "grok-3";

async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  // Option 1: Ollama (free, self-hosted)
  if (OLLAMA_URL) {
    const base = OLLAMA_URL.replace(/\/$/, "");
    const url  = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    const resp = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:       OLLAMA_MODEL,
        messages:    [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
        max_tokens:  4096,
        temperature: 0.3,
        stream:      false,
      }),
    });
    if (!resp.ok) throw new Error(`Ollama ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    const data = await resp.json() as { choices: [{ message: { content: string } }] };
    return data.choices[0]?.message?.content ?? "";
  }

  // Option 2: XAI/Grok (paid)
  const xaiKey = process.env.XAI_API_KEY;
  if (xaiKey && !xaiKey.startsWith("REPLACE")) {
    const resp = await fetch("https://api.x.ai/v1/chat/completions", {
      method:  "POST",
      headers: { "Authorization": `Bearer ${xaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model:       GROK_MODEL,
        messages:    [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
        max_tokens:  4096,
        temperature: 0.3,
      }),
    });
    if (!resp.ok) throw new Error(`XAI ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    const data = await resp.json() as { choices: [{ message: { content: string } }] };
    return data.choices[0]?.message?.content ?? "";
  }

  throw new Error("No LLM configured. Set OLLAMA_URL (recommended) or XAI_API_KEY.");
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return executeNextTask();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => ({}));
  if (body.admin_secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return executeNextTask(body.task_id);
}

async function executeNextTask(specificTaskId?: string): Promise<NextResponse> {
  const service = createServiceClient();

  const { data: rows } = specificTaskId
    ? await service.from("tasks").select("id, goal, agent_id, client_id").eq("id", specificTaskId).eq("status", "pending").limit(1)
    : await service.from("tasks").select("id, goal, agent_id, client_id").eq("status", "pending").order("created_at", { ascending: true }).limit(1);

  if (!rows || rows.length === 0) return NextResponse.json({ message: "No pending tasks" });

  const row = rows[0] as { id: string; goal: string; agent_id: string; client_id: string };
  const { id: taskId, goal, agent_id: agentId, client_id: clientId } = row;

  const { data: agentRow } = await service.from("agents").select("name, price_per_task, config_blob").eq("id", agentId).single() as { data: { name: string; price_per_task: number; config_blob: Record<string,unknown> } | null };
  if (!agentRow) {
    await service.from("tasks").update({ status: "failed", result_text: "Agent not found", completed_at: new Date().toISOString() }).eq("id", taskId);
    return NextResponse.json({ error: "agent_not_found" }, { status: 404 });
  }

  const config = (agentRow.config_blob ?? {}) as Record<string, unknown>;
  const systemPrompt = typeof config.system_prompt === "string" ? config.system_prompt : `You are ${agentRow.name}. Complete the goal and end with: TASK_COMPLETE: <summary>`;

  try {
    await service.rpc("charge_task", { p_task_id: taskId, p_client_id: clientId, p_agent_id: agentId, p_credits: agentRow.price_per_task });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await service.from("tasks").update({ status: "failed", result_text: msg.includes("nsufficien") ? "Insufficient credits." : `Charge failed: ${msg}`, completed_at: new Date().toISOString() }).eq("id", taskId);
    return NextResponse.json({ error: "charge_failed" });
  }

  await service.from("tasks").update({ status: "running", started_at: new Date().toISOString() }).eq("id", taskId);
  const backend = OLLAMA_URL ? `Ollama (${OLLAMA_MODEL})` : `XAI (${GROK_MODEL})`;
  const writeLog = async (type: string, content: string) => { await service.from("logs").insert({ task_id: taskId, type, content }).then(() => null); };
  await writeLog("system", `Started via ${backend}. Goal: ${goal.slice(0, 200)}`);

  let result = "";
  try {
    result = await callLLM(systemPrompt, `GOAL: ${goal}`);
    await writeLog("result", result.slice(0, 4000));
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await writeLog("error", errMsg);
    try { await service.rpc("refund_task", { p_task_id: taskId, p_client_id: clientId, p_credits: agentRow.price_per_task }); } catch { /* non-critical */ }
    await service.from("tasks").update({ status: "failed", result_text: `Error: ${errMsg.slice(0,500)}`, completed_at: new Date().toISOString() }).eq("id", taskId);
    return NextResponse.json({ error: errMsg, task_id: taskId }, { status: 500 });
  }

  const summary = result.includes("TASK_COMPLETE:") ? (result.split("TASK_COMPLETE:").pop()?.trim() ?? result).slice(0, 500) : result.slice(0, 500);
  await service.from("tasks").update({ status: "completed", result_text: result.slice(0,4000), result_summary: summary, completed_at: new Date().toISOString() }).eq("id", taskId);
  await writeLog("system", `Completed via ${backend}.`);

  return NextResponse.json({ ok: true, task_id: taskId, agent: agentRow.name, backend, summary: summary.slice(0,200) });
}

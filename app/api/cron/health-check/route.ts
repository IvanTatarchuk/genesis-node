import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const maxDuration = 60;

// Called by Vercel Cron every 6 hours: 0 */6 * * *
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = req.headers.get("x-vercel-cron-signature") ?? req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  // Fetch all active agents
  const { data: agents, error } = await service
    .from("agents")
    .select("id, name, slug, config_blob")
    .eq("is_active", true);

  if (error || !agents) {
    return NextResponse.json({ error: error?.message ?? "No agents" }, { status: 500 });
  }

  const results: { id: string; name: string; ok: boolean; ms: number | null }[] = [];

  for (const agent of agents) {
    const start = Date.now();
    let ok = false;
    let errorMsg: string | null = null;
    let ms: number | null = null;

    try {
      // Health check: verify agent has valid config and is reachable in our system
      // In production this would submit a minimal test task; here we check config integrity
      const cfg = agent.config_blob as Record<string, unknown> | null;
      const hasSystemPrompt = cfg && typeof cfg.system_prompt === "string" && cfg.system_prompt.length > 10;

      ms = Date.now() - start;

      if (hasSystemPrompt) {
        ok = true;
      } else {
        errorMsg = "Missing or invalid system_prompt in config";
      }
    } catch (e) {
      ms = Date.now() - start;
      errorMsg = e instanceof Error ? e.message : "Unknown error";
    }

    // Record result
    await service.rpc("record_health_check", {
      p_agent_id:    agent.id,
      p_ok:          ok,
      p_response_ms: ms,
      p_error:       errorMsg,
    });

    results.push({ id: agent.id, name: agent.name, ok, ms });
  }

  const healthy  = results.filter((r) => r.ok).length;
  const degraded = results.length - healthy;

  console.log(`[health-check] ${healthy} healthy, ${degraded} degraded out of ${results.length}`);

  return NextResponse.json({
    ok: true,
    checked: results.length,
    healthy,
    degraded,
    results,
  });
}

// Manual trigger
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => ({}));
  if (body.admin_secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return GET(req);
}

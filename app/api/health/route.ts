import { NextResponse } from "next/server";

import { summarizeHealth } from "@/lib/health";
import { probeSandbox } from "@/lib/sandbox";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Readiness probe for deploys. Reports whether the two things a real launch
 * depends on are in place: usable `unshare` sandbox namespaces (hard — grading
 * fails without them) and Supabase credentials (soft — runs still work, only
 * persistence degrades). Returns 503 when not ready to grade, 200 otherwise, so
 * an orchestrator/load balancer can gate traffic on it. Hit this right after a
 * deploy before pointing users at it.
 */
export async function GET(): Promise<NextResponse> {
  const report = summarizeHealth({
    sandbox: probeSandbox(),
    supabaseConfigured: isSupabaseConfigured(),
  });

  return NextResponse.json(report, { status: report.ready ? 200 : 503 });
}

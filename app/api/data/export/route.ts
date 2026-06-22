/**
 * GET /api/data/export
 * Returns a complete JSON export of all user's data on the platform
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Max 3 exports per hour
  const ip = getClientIp(req);
  const rl = rateLimit(`data-export:${ip}`, { limit: 3, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many export requests. Try again later." }, { status: 429 });
  }

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  // Fetch all user data in parallel
  const [
    { data: profile },
    { data: tasks },
    { data: agents },
    { data: transactions },
    { data: matadoraTxns },
    { data: matadoraWallet },
    { data: schedules },
    { data: apiKeys },
    { data: workspaces },
    { data: pipelines },
  ] = await Promise.all([
    service.from("profiles").select("*").eq("id", user.id).single(),
    service.from("tasks").select("id,goal,status,result_text,credits_charged,created_at,completed_at,agent_id").eq("client_id", user.id).order("created_at", { ascending: false }),
    service.from("agents").select("id,name,slug,description,price_per_task,total_tasks_completed,avg_rating,is_active,created_at").eq("developer_id", user.id),
    service.from("credit_transactions").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }),
    service.from("matadora_transactions").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }),
    service.from("matadora_wallets").select("balance,total_earned,total_spent,total_exchanged").eq("profile_id", user.id).single(),
    service.from("task_schedules").select("*").eq("profile_id", user.id),
    service.from("api_keys").select("id,name,created_at,last_used_at,requests_count").eq("profile_id", user.id),
    service.from("workspaces").select("*").eq("owner_id", user.id),
    service.from("pipelines").select("id,name,description,is_public,fork_count,created_at").eq("owner_id", user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    platform:    "AGENTS.DEV (Genesis Node)",
    user: {
      id:          user.id,
      email:       user.email,
      ...profile,
    },
    stats: {
      total_tasks:          (tasks ?? []).length,
      completed_tasks:      (tasks ?? []).filter((t: { status: string }) => t.status === "completed").length,
      total_credits_spent:  (transactions ?? []).filter((t: { type: string }) => t.type === "debit").reduce((s: number, t: { amount: number }) => s + t.amount, 0),
      agents_published:     (agents ?? []).length,
      matadora_balance:     matadoraWallet?.balance ?? 0,
    },
    tasks:                tasks ?? [],
    agents_published:     agents ?? [],
    credit_transactions:  transactions ?? [],
    matadora_wallet:      matadoraWallet,
    matadora_transactions: matadoraTxns ?? [],
    scheduled_tasks:      schedules ?? [],
    api_keys:             apiKeys ?? [],
    workspaces:           workspaces ?? [],
    pipelines:            pipelines ?? [],
  };

  const json = JSON.stringify(exportData, null, 2);
  const filename = `agents-dev-export-${user.id.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.json`;

  return new NextResponse(json, {
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}

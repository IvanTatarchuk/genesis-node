import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { sendWinnerEmail } from "@/lib/email";

// Vercel Cron: runs every Monday at 00:05 UTC
// Add to vercel.json: { "crons": [{ "path": "/api/cron/leaderboard-rewards", "schedule": "5 0 * * 1" }] }
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify cron secret (Vercel sets this automatically in production)
  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  // Run distribution for last week
  const { data, error } = await service.rpc("distribute_leaderboard_rewards");

  if (error) {
    console.error("[Cron] distribute_leaderboard_rewards failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[Cron] Rewards distributed:", data);

  // Send winner emails
  if (data?.winners && Array.isArray(data.winners)) {
    await sendWinnerEmails(data.winners, data.period, service);
  }

  return NextResponse.json({ ok: true, result: data });
}

// Also allow manual trigger via POST with admin key
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { adminKey } = await req.json().catch(() => ({}));
  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return GET(req);
}

async function sendWinnerEmails(
  winners: Array<{ category: string; rank: number; name: string; score: number; credits: number }>,
  period: string,
  service: ReturnType<typeof createServiceClient>
) {
  for (const winner of winners) {
    if (winner.rank > 3) continue; // Only email top-3 to avoid spam

    // Find user email for developers
    if (winner.category === "developer") {
      const { data: reward } = await service
        .from("leaderboard_rewards")
        .select("winner_id")
        .eq("category", "developer")
        .eq("rank", winner.rank)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (reward?.winner_id) {
        const { data: { user } } = await service.auth.admin.getUserById(reward.winner_id);
        if (user?.email) {
          await sendWinnerEmail({
            to: user.email,
            userName: winner.name,
            rank: winner.rank,
            category: winner.category,
            period,
            creditsAwarded: winner.credits,
            score: winner.score,
          });
        }
      }
    }
    // For agents, notify the creator — skip here to avoid duplicate (they get a dev email)
  }
}

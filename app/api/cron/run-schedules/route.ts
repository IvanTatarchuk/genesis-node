/**
 * Cron: Run due task schedules
 * Called every 15 minutes by Vercel Cron (see vercel.json)
 * Creates a new task for each schedule whose next_run_at is in the past
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { addDays, addMonths } from "@/lib/schedule-utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSchedules();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("x-admin-secret") ?? req.headers.get("authorization");
  if (secret !== process.env.ADMIN_SECRET && secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSchedules();
}

async function runSchedules(): Promise<NextResponse> {
  const service = createServiceClient();
  const now     = new Date().toISOString();

  // Find all due schedules
  const { data: due } = await service
    .from("task_schedules")
    .select("id, profile_id, agent_id, goal, frequency, run_at_hour, run_at_dow, run_count")
    .eq("is_active", true)
    .lte("next_run_at", now)
    .limit(50) as {
      data: Array<{
        id: string;
        profile_id: string;
        agent_id: string;
        goal: string;
        frequency: string;
        run_at_hour: number;
        run_at_dow: number;
        run_count: number;
      }> | null;
    };

  if (!due?.length) {
    return NextResponse.json({ ran: 0, message: "No due schedules" });
  }

  let ran = 0;
  let skipped = 0;

  for (const sched of due) {
    try {
      // Check user has enough credits
      const { data: profile } = await service
        .from("profiles")
        .select("balance")
        .eq("id", sched.profile_id)
        .single() as { data: { balance: number } | null };

      const { data: agent } = await service
        .from("agents")
        .select("price_per_task, is_active")
        .eq("id", sched.agent_id)
        .single() as { data: { price_per_task: number; is_active: boolean } | null };

      if (!agent?.is_active) {
        // Disable schedule if agent was removed
        await service.from("task_schedules")
          .update({ is_active: false })
          .eq("id", sched.id);
        skipped++;
        continue;
      }

      if (!profile || profile.balance < (agent?.price_per_task ?? 0)) {
        // Skip this run but keep schedule — notify user
        try {
          await service.from("notifications").insert({
            profile_id: sched.profile_id,
            type: "schedule_skipped",
            title: "Scheduled task skipped",
            body: `Not enough credits to run scheduled task "${sched.goal.slice(0, 60)}...". Top up to resume.`,
            link: "/pricing",
          });
        } catch (notifErr) { console.error(`[schedules] notification insert failed for ${sched.id}:`, notifErr); }
        skipped++;
        continue;
      }

      // Create the task
      const { data: task } = await service
        .from("tasks")
        .insert({
          client_id: sched.profile_id,
          agent_id:  sched.agent_id,
          goal:      `[Scheduled #${sched.run_count + 1}] ${sched.goal}`,
          status:    "pending",
        })
        .select("id")
        .single() as { data: { id: string } | null };

      if (!task) { skipped++; continue; }

      // Update schedule: set next_run_at, last_run_at, run_count
      const nextRun = computeNextRun(
        sched.frequency as "daily" | "weekly" | "monthly",
        sched.run_at_hour,
        sched.run_at_dow
      );

      await service.from("task_schedules").update({
        last_run_at:  now,
        last_task_id: task.id,
        next_run_at:  nextRun.toISOString(),
        run_count:    sched.run_count + 1,
        updated_at:   now,
      }).eq("id", sched.id);

      ran++;
    } catch (e) {
      console.error(`[schedules] Error processing ${sched.id}:`, e);
      skipped++;
    }
  }

  console.log(`[schedules] Ran ${ran}, skipped ${skipped}`);
  return NextResponse.json({ ran, skipped, total: due.length });
}

function computeNextRun(
  frequency: "hourly" | "daily" | "weekly" | "monthly",
  runAtHour: number,
  runAtDow: number
): Date {
  const now  = new Date();
  let next   = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(runAtHour);

  if (frequency === "hourly") {
    next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(now.getHours() + 1);
  } else if (frequency === "daily") {
    next = addDays(next, 1);
  } else if (frequency === "weekly") {
    const currentDow = now.getDay();
    const daysUntil  = (runAtDow - currentDow + 7) % 7 || 7;
    next = addDays(next, daysUntil);
  } else if (frequency === "monthly") {
    next = addMonths(next, 1);
    next.setDate(1);
  }
  return next;
}

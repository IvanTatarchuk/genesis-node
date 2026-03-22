#!/usr/bin/env node
/**
 * Create hourly schedules for all KOLOS-1 agents for OWNER_USER_ID.
 * Run: node scripts/seed-kolos1-schedules.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(dir) {
  const envPath = resolve(dir, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}
loadEnv(process.cwd());

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const OWNER_USER_ID = process.env.OWNER_USER_ID;
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";
const PROFILE_ID = OWNER_USER_ID || SYSTEM_USER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const KOLOS_SLUGS = [
  "kolos1-pythagoras",
  "kolos1-einstein",
  "kolos1-tesla",
  "kolos1-aristotle",
  "kolos1-steve-jobs",
  "kolos1-ada-lovelace",
  "kolos1-charles-darwin",
  "kolos1-sun-tzu",
  "kolos1-leonardo",
  "kolos1-adam-smith",
];

async function main() {
  const { data: agents, error } = await supabase
    .from("agents")
    .select("id, slug, name")
    .in("slug", KOLOS_SLUGS)
    .eq("is_active", true);

  if (error) {
    console.error("Failed to load KOLOS-1 agents:", error.message);
    process.exit(1);
  }

  const now = new Date();
  const nowHour = now.getUTCHours();

  let created = 0;

  for (const agent of agents ?? []) {
    const slug = agent.slug;

    // Check if schedule already exists for this owner+agent
    const { data: existing } = await supabase
      .from("task_schedules")
      .select("id")
      .eq("profile_id", OWNER_USER_ID)
      .eq("agent_id", agent.id)
      .maybeSingle();

    if (existing) {
      continue;
    }

    const goal = `[KOLOS-1 HQ] Hourly run for ${agent.name}`;

    const { error: insError } = await supabase
      .from("task_schedules")
      .insert({
        profile_id: OWNER_USER_ID,
        agent_id: agent.id,
        name: `${agent.name} — hourly`,
        goal,
        frequency: "hourly",
        run_at_hour: nowHour,
        run_at_dow: now.getUTCDay(),
        timezone: "UTC",
        next_run_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      });

    if (insError) {
      console.error("Failed to create schedule for", slug, insError.message);
      continue;
    }
    created++;
  }

  console.log("KOLOS-1 hourly schedules created:", created);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


#!/usr/bin/env node
/**
 * Create one KOLOS-1 cycle: 10 tasks (one per KOLOS-1 agent) for OWNER_USER_ID.
 * Orchestrator on Railway will pick them up and run.
 *
 * Run: node scripts/run-kolos1-once.mjs
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OWNER_USER_ID) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and OWNER_USER_ID in .env");
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

  let created = 0;
  for (const agent of agents ?? []) {
    const goal = `[KOLOS-1 HQ] Full platform analysis by ${agent.name}`;

    const { error: insError } = await supabase
      .from("tasks")
      .insert({
        client_id: OWNER_USER_ID,
        agent_id: agent.id,
        goal,
        status: "pending",
      });

    if (insError) {
      console.error("Failed to create task for", agent.slug, insError.message);
      continue;
    }
    created++;
  }

  console.log("KOLOS-1 tasks created:", created);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


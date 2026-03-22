#!/usr/bin/env node
/**
 * Seed 100 agents from scripts/agents-100-data.mjs.
 * Run: node scripts/seed-100-agents.mjs  or  npm run seed:agents
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { getAgentsData } from "./agents-100-data.mjs";

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
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const agents = getAgentsData();

async function main() {
  let inserted = 0;
  let skipped = 0;
  for (const a of agents) {
    const row = {
      creator_id: SYSTEM_USER_ID,
      name: a.name,
      slug: a.slug,
      description: a.description,
      long_description: a.long_description,
      config_blob: a.config_blob,
      price_per_task: a.price_per_task,
      tags: a.tags,
      category_slug: a.category_slug,
      is_active: true,
      is_featured: false,
    };
    const { error } = await supabase.from("agents").upsert(row, { onConflict: "slug" });
    if (error) {
      if (error.code === "23505") skipped++;
      else console.error(a.slug, error.message);
      continue;
    }
    inserted++;
  }
  console.log("Done. Inserted/updated:", inserted, "skipped:", skipped, "total:", agents.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

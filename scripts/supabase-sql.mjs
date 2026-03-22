#!/usr/bin/env node
/**
 * Run any SQL directly on Supabase via Management API
 * Usage: node scripts/supabase-sql.mjs "SELECT 1"
 *        node scripts/supabase-sql.mjs --file supabase/migrations/021_security_hardening_functions.sql
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

for (const line of readFileSync(resolve(".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF   = process.env.SUPABASE_PROJECT_REF || "qmvorahyrzrfvigxdwrq";
if (!TOKEN) { console.error("SUPABASE_ACCESS_TOKEN not set"); process.exit(1); }

let sql;
if (process.argv[2] === "--file") {
  sql = readFileSync(resolve(process.argv[3]), "utf8");
} else {
  sql = process.argv.slice(2).join(" ");
}
if (!sql.trim()) { console.error("No SQL provided"); process.exit(1); }

const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
const data = await r.json();
if (!r.ok) { console.error("Error:", JSON.stringify(data)); process.exit(1); }
console.log("Success:", JSON.stringify(data, null, 2));

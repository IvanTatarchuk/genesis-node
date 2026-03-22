import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load env
for (const line of readFileSync(resolve(".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(url, key, { auth: { persistSession: false } });

// Try to execute each view/function fix via rpc if available, otherwise log
const STMTS = [
  // We'll try calling a built-in function to check connectivity
  `SELECT current_database()`,
];

async function tryQuery(sql) {
  try {
    const { data, error } = await sb.rpc("exec_sql", { query: sql });
    if (error) console.error("rpc error:", error.message);
    else console.log("OK:", data);
  } catch(e) {
    console.error("exception:", e.message);
  }
}

await tryQuery("SELECT current_database()");

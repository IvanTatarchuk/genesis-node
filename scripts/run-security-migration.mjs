const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) { console.error("Missing env vars"); process.exit(1); }

// Read the migration file
const sql = fs.readFileSync("supabase/migrations/020_security_hardening.sql", "utf8");

// Split on semicolons and run each statement
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 10 && !s.startsWith("--"));

console.log(`Running ${statements.length} statements...`);

async function run() {
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ";";
    try {
      const { error } = await supabase.rpc("exec_sql", { sql: stmt });
      if (error) {
        // Try via REST if rpc not available
        console.log(`[${i+1}/${statements.length}] stmt length: ${stmt.length}`);
        console.error(`Error on stmt ${i+1}:`, error.message);
      } else {
        console.log(`[${i+1}/${statements.length}] OK`);
      }
    } catch(e) {
      console.error(`[${i+1}] Exception:`, e.message);
    }
  }
}
run().catch(console.error);

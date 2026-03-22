#!/usr/bin/env node
/**
 * Run the donation enum migration (015).
 * Option A: npx supabase login && npx supabase db push
 * Option B: Set DATABASE_URL in .env or env (Postgres from Supabase Dashboard → Settings → Database)
 *           then: npm run db:migrate-donation
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

const sql = `ALTER TYPE public.txn_type ADD VALUE IF NOT EXISTS 'donation';`;

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (dbUrl) {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(sql);
    console.log('OK: donation enum value added to txn_type.');
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log('OK: donation value already exists in txn_type.');
    } else {
      console.error('Migration failed:', e.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
  process.exit(0);
}

console.log(`
To add the "donation" enum for the donate feature, run one of:

1) Supabase CLI (recommended):
   npx supabase login
   npx supabase db push

2) Direct Postgres (get connection string from Supabase Dashboard → Settings → Database):
   npm install pg --save-dev
   set DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   node scripts/run-donation-migration.mjs

3) Supabase Dashboard: SQL Editor → paste and run:
   ${sql}
`);

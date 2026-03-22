import pkg from 'pg';
const { Client } = pkg;
const c = new Client({
  connectionString: 'postgres://postgres.qmvorahyrzrfvigxdwrq:Nokia202.1202@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
try {
  await c.connect();
  const r = await c.query('SELECT current_user as u');
  console.log('CONNECTED:', r.rows[0].u);
  await c.end();
} catch(e) { console.error('FAIL:', e.message); }

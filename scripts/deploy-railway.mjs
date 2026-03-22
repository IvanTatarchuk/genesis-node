#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
function loadEnv(dir) {
  const envPath = resolve(dir, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^[\"']|[\"']$/g, '').trim();
  }
}
loadEnv(process.cwd());
loadEnv(resolve(process.cwd(), 'trinity'));
const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';
const RAILWAY_ENV_ID = 'c6c54dd9-9a95-484e-ad70-15d9dd9b9537';
const SERVICE_IDS = { orchestrator: 'e3fb6c0f-3a53-4678-a475-8b8666ab2f6d', darwin: 'e042721f-6d4d-4aeb-97a7-aed038ed4917', trinity: '6ed322b4-58de-4d43-b11f-35ae5f023259' };
const token = process.env.RAILWAY_TOKEN;
if (!token) { console.error('RAILWAY_TOKEN not set. Add to .env or trinity/.env (Railway Dashboard → Project → Settings → Tokens), then run: npm run deploy:railway'); process.exit(1); }
async function deploy(serviceName) {
  const serviceId = SERVICE_IDS[serviceName];
  const query = 'mutation { serviceInstanceDeploy(serviceId: "' + serviceId + '", environmentId: "' + RAILWAY_ENV_ID + '") }';
  const res = await fetch(RAILWAY_API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token }, body: JSON.stringify({ query }) });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map(e => e.message).join('; '));
  return json.data?.serviceInstanceDeploy;
}
for (const name of ['darwin', 'trinity', 'orchestrator']) {
  try { const ok = await deploy(name); console.log(ok ? 'OK ' + name : 'FAIL ' + name); } catch (e) { console.error(name + ':', e.message); }
}

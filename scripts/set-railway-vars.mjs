const TOKEN   = 'c905f393-d52c-4e04-8a2c-33ccf5811eb7';
const PROJECT = '7f2fe8ec-7248-4429-b14a-419c90e5400c';
const ENV     = 'c6c54dd9-9a95-484e-ad70-15d9dd9b9537';
const API     = 'https://backboard.railway.app/graphql/v2';
const OLLAMA  = 'https://ollama-production-9f52.up.railway.app';
const SERVICES = { orchestrator: 'e3fb6c0f-3a53-4678-a475-8b8666ab2f6d', darwin: 'e042721f-6d4d-4aeb-97a7-aed038ed4917' };

async function setVar(serviceId, name, value) {
  const mutation = 'mutation { variableUpsert(input: { projectId: "' + PROJECT + '" serviceId: "' + serviceId + '" environmentId: "' + ENV + '" name: "' + name + '" value: "' + value + '" }) }';
  const r = await fetch(API, { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: mutation }) });
  const d = await r.json();
  if (d.errors) throw new Error(d.errors.map(e => e.message).join('; '));
  return d.data.variableUpsert;
}

async function redeploy(serviceId) {
  const q = 'mutation { serviceInstanceDeploy(serviceId: "' + serviceId + '", environmentId: "' + ENV + '") }';
  const r = await fetch(API, { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
  const d = await r.json();
  return d?.data?.serviceInstanceDeploy;
}

const vars = [
  ['orchestrator', 'OLLAMA_URL', OLLAMA],
  ['orchestrator', 'OLLAMA_MODEL', 'llama3.2:3b'],
  ['darwin', 'OLLAMA_URL', OLLAMA],
  ['darwin', 'OLLAMA_MODEL', 'llama3.2:3b'],
];
for (const [svc, name, val] of vars) {
  try { await setVar(SERVICES[svc], name, val); console.log('OK:', svc, name); }
  catch(e) { console.error('ERR:', svc, name, e.message); }
}
console.log('Redeploying orchestrator...');
const ok = await redeploy(SERVICES.orchestrator);
console.log('Orchestrator:', ok ? 'deploying' : 'failed');

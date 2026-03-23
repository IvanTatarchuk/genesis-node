// Test Groq API key
const key = process.argv[2];
if (!key) { console.log('Usage: node test-groq.mjs YOUR_KEY'); process.exit(1); }
const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'llama3-8b-8192', messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 }),
  signal: AbortSignal.timeout(15000),
});
const d = await r.json();
console.log(r.status, d.choices?.[0]?.message?.content ?? JSON.stringify(d).slice(0,100));

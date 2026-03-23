# Darwin — self-evolving marketplace agent

Darwin runs **24/7**: HTTP server for health checks and cron trigger, plus **internal scheduler** at 06:00, 14:00, 22:00 UTC.

## Run

```bash
# One-off run (exits after)
python darwin.py --now

# Server + scheduler (stays running)
python darwin.py
```

- **GET /health** — returns `{"ok": true}` (for Railway/lb health checks).
- **POST /run** — trigger one run. In production send `Authorization: Bearer YOUR_CRON_SECRET`. Returns 202 immediately; run runs in background. Optional body: `{"label": "custom"}`.

## Env (see .env.example)

- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — required.
- `ANTHROPIC_API_KEY` — Claude (primary if `OLLAMA_URL` not set).
- `CRON_SECRET` — required in prod for `POST /run`.
- `PORT` — default 8080 (Railway sets this).
- `MAX_AGENTS_PER_CATEGORY_PER_DAY` — max Darwin agents per category per day (default 3).
- `LLM_RETRIES` — retries + fallback to Ollama (default 3).

## Railway

Deploy as Docker; process listens on `PORT`. No external cron needed — internal schedule runs at 06/14/22 UTC. Optionally call **POST /run** from external cron (e.g. Vercel) for extra runs.

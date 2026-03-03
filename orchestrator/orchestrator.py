"""
Genesis Node — Orchestrator
Listens to Supabase 'tasks' table for pending tasks.
Spawns agent_runner coroutines (up to MAX_CONCURRENT_TASKS).
"""

import asyncio
import os
import json
import logging
from datetime import datetime, timezone

from supabase import create_client, Client
from aiohttp import web

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("orchestrator")

SUPABASE_URL   = os.environ["SUPABASE_URL"]
SUPABASE_KEY   = os.environ["SUPABASE_SERVICE_KEY"]
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT_TASKS", "5"))
POLL_INTERVAL  = int(os.getenv("POLL_INTERVAL_SECONDS", "5"))

# Track running tasks
running: dict[str, asyncio.Task] = {}


def db() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


async def fetch_pending(client: Client) -> list[dict]:
    """Fetch pending tasks not yet running."""
    res = (
        client.table("tasks")
        .select("id, goal, agent_id")
        .eq("status", "pending")
        .limit(MAX_CONCURRENT)
        .execute()
    )
    return res.data or []


async def fetch_agent_config(client: Client, agent_id: str) -> dict:
    """Get agent system prompt from config_blob."""
    res = (
        client.table("agents")
        .select("config_blob, name")
        .eq("id", agent_id)
        .single()
        .execute()
    )
    agent = res.data or {}
    config = agent.get("config_blob") or {}
    return {
        "name":          agent.get("name", "AI Agent"),
        "system_prompt": config.get("system_prompt", DEFAULT_SYSTEM_PROMPT),
    }


async def handle_task(task_id: str, goal: str, agent_id: str):
    """Run a single task to completion."""
    client = db()
    try:
        log.info(f"Starting task {task_id} — {goal[:80]}")
        config = await fetch_agent_config(client, agent_id)

        # Import here to avoid playwright startup at module load
        from agent_runner import run_task
        await asyncio.wait_for(
            run_task(task_id, goal, config["system_prompt"]),
            timeout=int(os.getenv("TASK_TIMEOUT_SECONDS", "600")),
        )
        log.info(f"Task {task_id} completed ✅")

    except asyncio.TimeoutError:
        log.error(f"Task {task_id} timed out ⏱")
        client.table("tasks").update({
            "status":       "failed",
            "result_text":  "Task timed out (600s limit).",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", task_id).execute()

    except Exception as e:
        log.error(f"Task {task_id} failed: {e}")
        client.table("tasks").update({
            "status":       "failed",
            "result_text":  f"Orchestrator error: {e}",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", task_id).execute()

    finally:
        running.pop(task_id, None)


async def poll_loop():
    """Main polling loop — checks for new tasks every POLL_INTERVAL seconds."""
    log.info(f"🚀 Orchestrator started. Max concurrent: {MAX_CONCURRENT}, poll: {POLL_INTERVAL}s")
    client = db()

    while True:
        try:
            if len(running) < MAX_CONCURRENT:
                tasks = await fetch_pending(client)
                for task in tasks:
                    tid = task["id"]
                    if tid not in running:
                        t = asyncio.create_task(
                            handle_task(tid, task["goal"], task["agent_id"])
                        )
                        running[tid] = t
                        log.info(f"Dispatched task {tid} ({len(running)}/{MAX_CONCURRENT} slots used)")

        except Exception as e:
            log.error(f"Poll error: {e}")

        await asyncio.sleep(POLL_INTERVAL)


# ── Health check HTTP server ────────────────────────────────────────────────
async def health(_req: web.Request) -> web.Response:
    return web.json_response({
        "status":          "ok",
        "running_tasks":   len(running),
        "max_concurrent":  MAX_CONCURRENT,
        "task_ids":        list(running.keys()),
        "timestamp":       datetime.now(timezone.utc).isoformat(),
    })


async def main():
    app = web.Application()
    app.router.add_get("/health", health)
    app.router.add_get("/",       health)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 8080)
    await site.start()
    log.info("Health endpoint: http://0.0.0.0:8080/health")

    await poll_loop()


DEFAULT_SYSTEM_PROMPT = """You are an autonomous AI agent powered by Grok-3.
You can browse the web, extract information, and complete tasks.
Always be thorough, cite sources, and provide structured results.
"""

if __name__ == "__main__":
    asyncio.run(main())

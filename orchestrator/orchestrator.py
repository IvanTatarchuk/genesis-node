"""
Genesis Node — Orchestrator v2
Listens to Supabase 'tasks' table for pending tasks.
Spawns agent_runner coroutines (up to MAX_CONCURRENT_TASKS).

Fixes in v2:
- charge_task() RPC called before task starts (atomic credit deduction)
- Refund on failure/timeout
- Stuck task recovery on startup
- Better error logging
"""

import asyncio
import os
import logging
from datetime import datetime, timezone, timedelta

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
TASK_TIMEOUT   = int(os.getenv("TASK_TIMEOUT_SECONDS", "600"))

# Track running tasks
running: dict[str, asyncio.Task] = {}


def db() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


async def fetch_pending(client: Client) -> list[dict]:
    """Fetch pending tasks with agent pricing info."""
    res = (
        client.table("tasks")
        .select("id, goal, agent_id, client_id, agents(price_per_task, name)")
        .eq("status", "pending")
        .order("created_at", desc=False)
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


async def charge_task(client: Client, task_id: str, client_id: str, agent_id: str, credits: int) -> bool:
    """
    Atomically charge credits via Supabase RPC.
    Returns True if successful, False if insufficient balance.
    """
    try:
        res = client.rpc("charge_task", {
            "p_task_id":   task_id,
            "p_client_id": client_id,
            "p_agent_id":  agent_id,
            "p_credits":   credits,
        }).execute()
        log.info(f"[charge] Task {task_id}: {credits} credits charged from {client_id}")
        return True
    except Exception as e:
        err_msg = str(e)
        if "Insufficient credits" in err_msg:
            log.warning(f"[charge] Task {task_id}: insufficient credits for {client_id}")
        else:
            log.error(f"[charge] Task {task_id}: charge_task() failed: {e}")
        return False


async def refund_task(client: Client, task_id: str, client_id: str, credits: int):
    """Refund credits on task failure."""
    try:
        client.rpc("refund_task", {
            "p_task_id":   task_id,
            "p_client_id": client_id,
            "p_credits":   credits,
        }).execute()
        log.info(f"[refund] Task {task_id}: {credits} credits refunded to {client_id}")
    except Exception as e:
        log.error(f"[refund] Task {task_id}: refund failed: {e}")


async def handle_task(task_id: str, goal: str, agent_id: str, client_id: str, price: int):
    """
    Run a single task to completion.
    1. Charge credits atomically
    2. Run the agent
    3. Refund on failure
    """
    client = db()
    charged = False

    try:
        log.info(f"[task] {task_id} — '{goal[:80]}' — ⚡{price} credits")

        # ── STEP 1: Charge credits (atomic) ──────────────────────────────────
        charged = await charge_task(client, task_id, client_id, agent_id, price)
        if not charged:
            # Mark as failed — client doesn't have enough credits
            client.table("tasks").update({
                "status":       "failed",
                "result_text":  "Insufficient credits. Please top up your balance.",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", task_id).execute()
            log.warning(f"[task] {task_id} cancelled — insufficient credits")
            return

        # ── STEP 2: Fetch agent config ────────────────────────────────────────
        config = await fetch_agent_config(client, agent_id)

        # ── STEP 3: Run the agent ─────────────────────────────────────────────
        from agent_runner import run_task
        result = await asyncio.wait_for(
            run_task(task_id, goal, config["system_prompt"]),
            timeout=TASK_TIMEOUT,
        )

        # Check if agent reported an error in its result
        if result and ("Error:" in result or "timed out" in result.lower()):
            log.warning(f"[task] {task_id} completed with error result — refunding")
            await refund_task(client, task_id, client_id, price)
        else:
            log.info(f"[task] {task_id} completed ✅")

            # Update agent task count (denormalized stat)
            try:
                client.table("agents").update({
                    "total_tasks_completed": client.table("agents")
                        .select("total_tasks_completed")
                        .eq("id", agent_id)
                        .single()
                        .execute()
                        .data.get("total_tasks_completed", 0) + 1
                }).eq("id", agent_id).execute()
            except Exception:
                pass  # non-critical

    except asyncio.TimeoutError:
        log.error(f"[task] {task_id} timed out ⏱ after {TASK_TIMEOUT}s")
        client.table("tasks").update({
            "status":       "failed",
            "result_text":  f"Task timed out after {TASK_TIMEOUT} seconds.",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", task_id).execute()
        # Refund on timeout — partial work, but fair to client
        if charged:
            await refund_task(client, task_id, client_id, price)

    except Exception as e:
        log.error(f"[task] {task_id} failed with exception: {e}")
        client.table("tasks").update({
            "status":       "failed",
            "result_text":  f"Agent error: {str(e)[:500]}",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", task_id).execute()
        # Refund on unexpected errors
        if charged:
            await refund_task(client, task_id, client_id, price)

    finally:
        running.pop(task_id, None)


async def recover_stuck_tasks(client: Client):
    """On startup: reset tasks that were running before a crash."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    try:
        res = client.table("tasks").update({
            "status":     "pending",
            "started_at": None,
        }).eq("status", "running").lt("started_at", cutoff).execute()
        count = len(res.data or [])
        if count > 0:
            log.info(f"[startup] Recovered {count} stuck tasks → pending")
    except Exception as e:
        log.warning(f"[startup] Could not recover stuck tasks: {e}")


async def poll_loop():
    """Main polling loop — checks for new tasks every POLL_INTERVAL seconds."""
    log.info(f"🚀 Orchestrator v2 started. Max concurrent: {MAX_CONCURRENT}, poll: {POLL_INTERVAL}s")
    client = db()

    # Recover any tasks that were running before restart
    await recover_stuck_tasks(client)

    while True:
        try:
            if len(running) < MAX_CONCURRENT:
                tasks = await fetch_pending(client)
                for task in tasks:
                    tid = task["id"]
                    if tid not in running:
                        # Extract price from joined agents data
                        agent_data = task.get("agents") or {}
                        price = agent_data.get("price_per_task", 100)
                        client_id = task.get("client_id", "")

                        if not client_id:
                            log.error(f"[poll] Task {tid} has no client_id — skipping")
                            continue

                        t = asyncio.create_task(
                            handle_task(tid, task["goal"], task["agent_id"], client_id, price)
                        )
                        running[tid] = t
                        log.info(f"[poll] Dispatched {tid} — ⚡{price}cr ({len(running)}/{MAX_CONCURRENT} slots)")

        except Exception as e:
            log.error(f"[poll] Error: {e}")

        await asyncio.sleep(POLL_INTERVAL)


# ── Health check HTTP server ──────────────────────────────────────────────────

async def health(_req: web.Request) -> web.Response:
    return web.json_response({
        "status":         "ok",
        "version":        "2.0",
        "running_tasks":  len(running),
        "max_concurrent": MAX_CONCURRENT,
        "task_ids":       list(running.keys()),
        "timestamp":      datetime.now(timezone.utc).isoformat(),
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


DEFAULT_SYSTEM_PROMPT = """You are an autonomous AI agent powered by Claude (Anthropic).
You can browse the web, extract information, analyze data, and complete tasks.
Always be thorough, cite your sources, and provide well-structured results.
End your response with: TASK_COMPLETE: <summary of what was accomplished>
"""

if __name__ == "__main__":
    asyncio.run(main())

"""
GENESIS NODE — Orchestrator
============================
Migration of dashboard.py to a production-grade async service.

Responsibilities:
  1. Subscribe to Supabase Realtime on `tasks` table.
  2. When a new `pending` task appears:
       a. Verify client has enough credits.
       b. Call `charge_task()` to deduct credits atomically.
       c. Spin up an isolated Docker container running DevAgent.
       d. Pass TASK_ID + SUPABASE creds as env vars to the container.
  3. Monitor running containers and update task status on exit.
  4. Expose a minimal Flask health-check endpoint.

Environment variables required (.env file or Docker secret):
  SUPABASE_URL          — https://<project>.supabase.co
  SUPABASE_SERVICE_KEY  — service_role secret key (bypasses RLS)
  DOCKER_AGENT_IMAGE    — Docker image tag for DevAgent
  DOCKER_NETWORK        — Docker network name (default: genesis_net)
  MAX_CONCURRENT_TASKS  — Max parallel containers (default: 5)
  TASK_TIMEOUT_SECONDS  — Kill container after N seconds (default: 600)
"""

from __future__ import annotations

import asyncio
import logging
import os
import signal
import sys
from datetime import datetime, timezone
from typing import Any

import docker
import docker.errors
from dotenv import load_dotenv
from flask import Flask, jsonify
from supabase import Client, create_client
from realtime import AsyncRealtimeClient   # pip install realtime

# ─── Bootstrap ────────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("orchestrator")

SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
AGENT_IMAGE          = os.environ.get("DOCKER_AGENT_IMAGE", "genesis-node/devagent:latest")
DOCKER_NETWORK       = os.environ.get("DOCKER_NETWORK", "genesis_net")
MAX_CONCURRENT       = int(os.environ.get("MAX_CONCURRENT_TASKS", "5"))
TASK_TIMEOUT         = int(os.environ.get("TASK_TIMEOUT_SECONDS", "600"))

# Service-role client — used for all DB writes (bypasses RLS)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
docker_client     = docker.from_env()

# Track running containers: {task_id: container}
running: dict[str, Any] = {}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def log_to_db(task_id: str, log_type: str, content: str, metadata: dict | None = None) -> None:
    """Insert a log row — will be broadcast to client via Supabase Realtime."""
    try:
        supabase.table("logs").insert({
            "task_id":   task_id,
            "type":      log_type,
            "content":   content,
            "metadata":  metadata or {},
            "timestamp": now_iso(),
        }).execute()
    except Exception as exc:
        log.error("log_to_db failed: %s", exc)


def mark_task(task_id: str, status: str, **kwargs: Any) -> None:
    payload: dict[str, Any] = {"status": status, "updated_at": now_iso(), **kwargs}
    if status in ("completed", "failed", "cancelled"):
        payload["completed_at"] = now_iso()
    supabase.table("tasks").update(payload).eq("id", task_id).execute()


def fetch_pending_tasks() -> list[dict]:
    """Startup catch-up: grab any tasks that were `pending` before we started."""
    resp = (
        supabase.table("tasks")
        .select("id, client_id, agent_id, goal")
        .eq("status", "pending")
        .order("created_at")
        .execute()
    )
    return resp.data or []


# ─── Task Lifecycle ───────────────────────────────────────────────────────────

async def handle_new_task(task: dict) -> None:
    task_id   = task["id"]
    client_id = task["client_id"]
    agent_id  = task["agent_id"]
    goal      = task["goal"]

    log.info("New task  task_id=%s  agent=%s", task_id, agent_id)

    if len(running) >= MAX_CONCURRENT:
        log.warning("At capacity (%d). Deferring task %s.", MAX_CONCURRENT, task_id)
        # Re-check in 30 s — a simple backoff without a queue service
        await asyncio.sleep(30)
        if len(running) < MAX_CONCURRENT:
            await handle_new_task(task)
        return

    # ── Fetch agent config & price ──────────────────────────────────────────
    agent_resp = (
        supabase.table("agents")
        .select("price_per_task, config_blob, creator_id")
        .eq("id", agent_id)
        .single()
        .execute()
    )
    if not agent_resp.data:
        log.error("Agent %s not found. Failing task %s.", agent_id, task_id)
        mark_task(task_id, "failed")
        return

    agent_cfg   = agent_resp.data
    price       = agent_cfg["price_per_task"]

    # ── Charge credits atomically ──────────────────────────────────────────
    charge_resp = supabase.rpc(
        "charge_task",
        {"p_task_id": task_id, "p_client_id": client_id, "p_credits": price},
    ).execute()

    if not charge_resp.data:
        log.warning("Insufficient credits for client %s. task_id=%s", client_id, task_id)
        mark_task(task_id, "cancelled")
        log_to_db(task_id, "system", "⚡ Insufficient credits — task cancelled.")
        return

    log_to_db(task_id, "system", f"✅ Credits charged ({price}). Launching agent…")

    # ── Spin up Docker container ───────────────────────────────────────────
    try:
        container = docker_client.containers.run(
            image     = AGENT_IMAGE,
            name      = f"agent_{task_id[:8]}",
            detach    = True,
            remove    = False,       # We clean up manually after status check
            network   = DOCKER_NETWORK,
            mem_limit = "512m",
            nano_cpus = 1_000_000_000,   # 1 vCPU
            read_only = False,
            # Prevent container from accessing host filesystem
            volumes   = {
                "/tmp/agent_workspaces/" + task_id: {
                    "bind": "/workspace",
                    "mode": "rw",
                }
            },
            environment = {
                "TASK_ID":            task_id,
                "GOAL":               goal,
                "AGENT_CONFIG":       str(agent_cfg["config_blob"]),
                "SUPABASE_URL":       SUPABASE_URL,
                "SUPABASE_KEY":       SUPABASE_SERVICE_KEY,
                # Pass XAI / Playwright creds from orchestrator environment
                "XAI_API_KEY":        os.environ.get("XAI_API_KEY", ""),
                "DISPLAY":            ":99",             # Virtual display for Playwright
            },
            labels = {
                "genesis.task_id":  task_id,
                "genesis.agent_id": agent_id,
            },
        )
    except docker.errors.ImageNotFound:
        log.error("Docker image %s not found.", AGENT_IMAGE)
        mark_task(task_id, "failed")
        supabase.rpc(
            "refund_task",
            {"p_task_id": task_id, "p_client_id": client_id, "p_credits": price},
        ).execute()
        log_to_db(task_id, "error", "❌ Internal error: agent image not available.")
        return
    except Exception as exc:
        log.exception("Failed to start container for task %s: %s", task_id, exc)
        mark_task(task_id, "failed")
        supabase.rpc(
            "refund_task",
            {"p_task_id": task_id, "p_client_id": client_id, "p_credits": price},
        ).execute()
        log_to_db(task_id, "error", f"❌ Container start error: {exc}")
        return

    running[task_id] = container
    mark_task(task_id, "running", container_id=container.id)
    log_to_db(task_id, "system", f"🐳 Container {container.short_id} started.")
    log.info("Container %s started for task %s", container.short_id, task_id)

    # ── Monitor in background ──────────────────────────────────────────────
    asyncio.create_task(monitor_container(task_id, client_id, price, container))


async def monitor_container(
    task_id: str,
    client_id: str,
    price: int,
    container: Any,
) -> None:
    """Poll container status and handle timeout."""
    deadline = asyncio.get_event_loop().time() + TASK_TIMEOUT

    while True:
        await asyncio.sleep(5)

        # Timeout guard
        if asyncio.get_event_loop().time() > deadline:
            log.warning("Task %s timed out. Killing container.", task_id)
            try:
                container.kill()
            except Exception:
                pass
            mark_task(task_id, "failed")
            supabase.rpc(
                "refund_task",
                {"p_task_id": task_id, "p_client_id": client_id, "p_credits": price},
            ).execute()
            log_to_db(task_id, "error", f"⏱ Task timed out after {TASK_TIMEOUT}s — credits refunded.")
            running.pop(task_id, None)
            return

        try:
            container.reload()
        except docker.errors.NotFound:
            # Container removed externally
            log.warning("Container for task %s vanished unexpectedly.", task_id)
            mark_task(task_id, "failed")
            running.pop(task_id, None)
            return

        status = container.status   # 'running' | 'exited' | 'dead' | ...

        if status == "exited":
            exit_code = container.attrs["State"]["ExitCode"]
            log.info("Task %s finished with exit_code=%d", task_id, exit_code)

            if exit_code == 0:
                mark_task(task_id, "completed")
                log_to_db(task_id, "system", "🎉 Agent completed task successfully.")
            else:
                mark_task(task_id, "failed")
                supabase.rpc(
                    "refund_task",
                    {"p_task_id": task_id, "p_client_id": client_id, "p_credits": price},
                ).execute()
                stderr = container.logs(stderr=True, stdout=False, tail=50).decode("utf-8", errors="replace")
                log_to_db(task_id, "error", f"❌ Agent exited with code {exit_code}.\n{stderr}")

            # Clean up container
            try:
                container.remove(force=True)
            except Exception:
                pass

            running.pop(task_id, None)
            return


# ─── Supabase Realtime Listener ───────────────────────────────────────────────

async def start_realtime_listener() -> None:
    realtime_url = SUPABASE_URL.replace("https://", "wss://") + "/realtime/v1"

    while True:
        try:
            socket = AsyncRealtimeClient(
                realtime_url,
                token=SUPABASE_SERVICE_KEY,
                auto_reconnect=True,
            )
            await socket.connect()

            channel = socket.channel("public:tasks")

            async def on_insert(payload: dict) -> None:
                record = payload.get("record", {})
                if record.get("status") == "pending":
                    asyncio.create_task(handle_new_task(record))

            channel.on_postgres_changes(
                event="INSERT",
                schema="public",
                table="tasks",
                callback=on_insert,
            )

            await channel.subscribe()
            log.info("Realtime listener connected and subscribed to public.tasks.")
            await socket.listen()   # blocks until disconnected

        except Exception as exc:
            log.error("Realtime connection error: %s — reconnecting in 10s.", exc)
            await asyncio.sleep(10)


# ─── Flask health-check (runs in background thread) ──────────────────────────

health_app = Flask("orchestrator-health")


@health_app.route("/health")
def health() -> Any:
    return jsonify({
        "status":          "ok",
        "running_tasks":   len(running),
        "capacity":        MAX_CONCURRENT,
        "timestamp":       now_iso(),
    })


@health_app.route("/tasks/running")
def running_tasks() -> Any:
    return jsonify({"tasks": list(running.keys())})


def run_flask() -> None:
    health_app.run(host="0.0.0.0", port=8080, debug=False, use_reloader=False)


# ─── Main ─────────────────────────────────────────────────────────────────────

async def main() -> None:
    log.info("GENESIS NODE Orchestrator starting…")

    # Graceful shutdown
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(_shutdown()))

    # Catch up on tasks that arrived while orchestrator was offline
    pending_backlog = fetch_pending_tasks()
    if pending_backlog:
        log.info("Found %d pending tasks on startup. Processing backlog…", len(pending_backlog))
        for task in pending_backlog:
            asyncio.create_task(handle_new_task(task))

    # Start health server in a thread
    import threading
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    log.info("Health endpoint listening on :8080")

    await start_realtime_listener()


async def _shutdown() -> None:
    log.info("Shutdown signal received. Waiting for running tasks…")
    for task_id, container in list(running.items()):
        log.info("Signalling container for task %s", task_id)
        try:
            container.stop(timeout=15)
        except Exception:
            pass
    sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())

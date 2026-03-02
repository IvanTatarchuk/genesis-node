"""
GENESIS NODE — DevAgent entry point
=====================================
This is the integration template for your existing agent.

HOW TO MIGRATE YOUR EXISTING main.py:
  1. Copy your existing code into the `run_agent()` function below.
  2. Replace every print() / logging.info() call with logger.thought/action/result/error.
  3. Make sure you exit with sys.exit(0) on success, sys.exit(1) on failure.
  4. Build the Docker image: docker build -t genesis-node/devagent:latest ./agent

Environment variables injected by the orchestrator:
  TASK_ID          — UUID of the task (use for logging)
  GOAL             — The client's goal string
  AGENT_CONFIG     — JSON string of the agent's config_blob (system_prompt etc.)
  SUPABASE_URL     — For logging via AgentLogger
  SUPABASE_KEY     — Service role key
  XAI_API_KEY      — Your Grok-3 API key
  DISPLAY          — :99 (virtual Xvfb display, already started by entrypoint)
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from supabase_logger import AgentLogger

# ─── CLI args ─────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="GENESIS NODE DevAgent")
parser.add_argument("--goal",    required=True,  help="The client's goal")
parser.add_argument("--task-id", required=True,  dest="task_id", help="Supabase task UUID")
args = parser.parse_args()

GOAL     = args.goal
TASK_ID  = args.task_id

# ─── Logger (streams every call to Supabase Realtime → client browser) ────────
logger = AgentLogger(task_id=TASK_ID)

# ─── Agent config (from config_blob registered in marketplace) ────────────────
try:
    AGENT_CONFIG: dict = json.loads(os.environ.get("AGENT_CONFIG", "{}"))
except json.JSONDecodeError:
    AGENT_CONFIG = {}

SYSTEM_PROMPT = AGENT_CONFIG.get(
    "system_prompt",
    "You are DevAgent, an autonomous AI assistant. Complete the given goal step by step."
)

XAI_API_KEY = os.environ["XAI_API_KEY"]

# ─── Grok-3 client (xAI uses OpenAI-compatible API) ─────────────────────────
from openai import OpenAI

grok = OpenAI(
    api_key  = XAI_API_KEY,
    base_url = "https://api.x.ai/v1",
)

# ─── Browser / GUI tools (your existing imports) ─────────────────────────────
try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

# ─── Main agent loop ──────────────────────────────────────────────────────────

def run_agent() -> None:
    """
    Replace the body of this function with your existing agent logic.
    Use `logger` instead of print/logging everywhere.
    """
    logger.system(f"Agent started. Goal: {GOAL}")

    # ── Step 1: Ask Grok-3 to plan the task ──────────────────────────────────
    logger.thought("Asking Grok-3 to plan the execution steps…")

    messages = [
        {"role": "system",  "content": SYSTEM_PROMPT},
        {"role": "user",    "content": f"GOAL: {GOAL}\n\nBreak this into numbered steps."},
    ]

    plan_response = grok.chat.completions.create(
        model       = "grok-3",       # or "grok-3-mini" for lighter tasks
        messages    = messages,
        temperature = 0.3,
        max_tokens  = 1024,
    )
    plan = plan_response.choices[0].message.content or ""
    logger.thought(f"Plan:\n{plan}")

    # Add plan to conversation history
    messages.append({"role": "assistant", "content": plan})

    # ── Step 2: Execute the plan (your existing loop goes here) ─────────────
    # EXAMPLE: If your agent uses Playwright, here's how to log it:
    if PLAYWRIGHT_AVAILABLE and "browser" in GOAL.lower():
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page    = browser.new_page()

            # Log browser actions
            logger.action("browser.launch", engine="chromium")

            # Example: navigate to a URL extracted from the goal
            # In your real code, Grok-3 tells you what URL to visit
            logger.action("browser.goto", url="https://example.com")
            page.goto("https://example.com")

            title = page.title()
            logger.result(f"Page title: {title}")

            browser.close()
            logger.action("browser.close")

    # ── Step 3: Ask Grok-3 for a final summary ────────────────────────────────
    messages.append({
        "role":    "user",
        "content": "Summarise what was accomplished in 2-3 sentences for the client.",
    })

    summary_response = grok.chat.completions.create(
        model    = "grok-3",
        messages = messages,
        max_tokens = 256,
    )
    summary = summary_response.choices[0].message.content or "Task completed."
    logger.result(summary)

    # ── Write result summary back to Supabase ────────────────────────────────
    from supabase import create_client
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    sb.table("tasks").update({
        "result_summary": summary,
        "status":         "completed",
    }).eq("id", TASK_ID).execute()

    logger.system("✅ Task complete. Exiting.")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        run_agent()
        sys.exit(0)          # ← orchestrator marks task as "completed"
    except KeyboardInterrupt:
        logger.error("Agent interrupted.")
        sys.exit(1)
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Unhandled exception: {exc}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)          # ← orchestrator refunds credits

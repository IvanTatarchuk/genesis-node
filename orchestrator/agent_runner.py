"""
Genesis Node — Agent Runner
Executes a single task using Claude (Sonnet) + Playwright.
Logs every thought/action/result to Supabase logs table.
"""

import asyncio
import os
import json
import base64
from datetime import datetime, timezone
from typing import Optional

from supabase import create_client, Client
import anthropic
from playwright.async_api import async_playwright, Page


SUPABASE_URL        = os.environ["SUPABASE_URL"]
SUPABASE_KEY        = os.environ["SUPABASE_SERVICE_KEY"]
ANTHROPIC_API_KEY   = os.environ["ANTHROPIC_API_KEY"]
CLAUDE_MODEL        = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5")
MAX_STEPS           = int(os.getenv("MAX_STEPS", "20"))
TIMEOUT_SECS        = int(os.getenv("TASK_TIMEOUT_SECONDS", "600"))


def supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def claude() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)


async def log(db: Client, task_id: str, log_type: str, content: str):
    """Write a log line to Supabase."""
    db.table("logs").insert({
        "task_id":  task_id,
        "type":     log_type,
        "content":  content,
    }).execute()


async def screenshot_base64(page: Page) -> str:
    """Take a screenshot and return as base64."""
    png = await page.screenshot(full_page=False)
    return base64.b64encode(png).decode()


async def run_task(task_id: str, goal: str, system_prompt: str):
    """
    Main agent loop:
    1. Think (Claude text + vision)
    2. Act (Playwright browser actions)
    3. Observe (screenshot → Claude vision)
    4. Repeat until DONE or max steps
    """
    db = supabase()
    ai = claude()

    # Mark as running
    db.table("tasks").update({
        "status":     "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", task_id).execute()

    await log(db, task_id, "system", f"🚀 Agent started. Goal: {goal}")

    full_system = system_prompt + AGENT_INSTRUCTIONS

    # Anthropic uses system separately; conversation messages start with user
    messages = [
        {"role": "user", "content": f"GOAL: {goal}"},
    ]

    result_text = ""

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            page = await browser.new_page(
                viewport={"width": 1280, "height": 720},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            )

            for step in range(MAX_STEPS):
                await log(db, task_id, "thought", f"Step {step + 1}/{MAX_STEPS} — thinking…")

                # ── THINK ──────────────────────────────────────────────────
                # Take screenshot for vision context (Claude supports vision natively)
                try:
                    screenshot = await screenshot_base64(page)
                    vision_content = [
                        {"type": "text", "text": "Current browser state (screenshot):"},
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": screenshot,
                            },
                        },
                    ]
                    think_messages = messages + [{"role": "user", "content": vision_content}]
                except Exception:
                    think_messages = messages

                response = await ai.messages.create(
                    model=CLAUDE_MODEL,
                    system=full_system,
                    messages=think_messages,
                    max_tokens=1024,
                    temperature=0.2,
                )

                thought = response.content[0].text if response.content else ""
                messages.append({"role": "assistant", "content": thought})
                await log(db, task_id, "thought", thought)

                # ── DONE CHECK ─────────────────────────────────────────────
                if "TASK_COMPLETE:" in thought:
                    result_text = thought.split("TASK_COMPLETE:")[-1].strip()
                    await log(db, task_id, "result", result_text)
                    break

                # ── ACT ────────────────────────────────────────────────────
                action = parse_action(thought)
                if action:
                    action_log = await execute_action(page, action)
                    await log(db, task_id, "action", action_log)
                    messages.append({"role": "user", "content": f"Action result: {action_log}"})
                    await asyncio.sleep(1)  # brief pause for page load

            else:
                result_text = "Max steps reached. Partial result: " + thought[:500]
                await log(db, task_id, "result", result_text)

            await browser.close()

    except asyncio.TimeoutError:
        result_text = "Task timed out."
        await log(db, task_id, "error", result_text)
    except Exception as e:
        result_text = f"Error: {e}"
        await log(db, task_id, "error", result_text)

    # ── Mark complete ───────────────────────────────────────────────────────
    final_status = "completed" if "Error" not in result_text and "timed out" not in result_text else "failed"

    db.table("tasks").update({
        "status":       final_status,
        "result_text":  result_text[:4000],
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", task_id).execute()

    await log(db, task_id, "system", f"✅ Task {final_status}.")
    return result_text


def parse_action(thought: str) -> Optional[dict]:
    """Extract ACTION: {...} JSON from thought."""
    try:
        if "ACTION:" not in thought:
            return None
        raw = thought.split("ACTION:")[-1].strip()
        start = raw.index("{")
        end   = raw.rindex("}") + 1
        return json.loads(raw[start:end])
    except Exception:
        return None


async def execute_action(page: Page, action: dict) -> str:
    """Execute a browser action and return result description."""
    cmd  = action.get("cmd", "")
    args = action.get("args", {})

    try:
        if cmd == "navigate":
            await page.goto(args["url"], timeout=15000, wait_until="domcontentloaded")
            return f"Navigated to {args['url']}"

        elif cmd == "click":
            selector = args.get("selector", "")
            await page.click(selector, timeout=5000)
            return f"Clicked: {selector}"

        elif cmd == "type":
            selector = args.get("selector", "")
            text     = args.get("text", "")
            await page.fill(selector, text)
            return f"Typed into {selector}"

        elif cmd == "extract_text":
            selector = args.get("selector", "body")
            el = page.locator(selector)
            text = await el.inner_text(timeout=5000)
            return text[:2000]

        elif cmd == "scroll":
            await page.evaluate("window.scrollBy(0, window.innerHeight)")
            return "Scrolled down"

        elif cmd == "wait":
            secs = float(args.get("seconds", 2))
            await asyncio.sleep(min(secs, 10))
            return f"Waited {secs}s"

        elif cmd == "search_web":
            query = args.get("query", "")
            url   = f"https://www.google.com/search?q={query.replace(' ', '+')}"
            await page.goto(url, timeout=15000, wait_until="domcontentloaded")
            results = await page.locator("div.g").all_inner_texts()
            return "\n".join(results[:5])[:2000]

        else:
            return f"Unknown command: {cmd}"

    except Exception as e:
        return f"Action failed: {e}"


AGENT_INSTRUCTIONS = """

## HOW TO RESPOND

At each step output one of:

1. A THOUGHT describing what you plan to do, then an ACTION:
   ACTION: {"cmd": "navigate", "args": {"url": "https://example.com"}}
   ACTION: {"cmd": "search_web", "args": {"query": "AI trends 2025"}}
   ACTION: {"cmd": "click", "args": {"selector": "button.submit"}}
   ACTION: {"cmd": "type", "args": {"selector": "input#search", "text": "hello"}}
   ACTION: {"cmd": "extract_text", "args": {"selector": "article"}}
   ACTION: {"cmd": "scroll", "args": {}}
   ACTION: {"cmd": "wait", "args": {"seconds": 2}}

2. When the task is done:
   TASK_COMPLETE: <your final answer or result here>

Be concise. Always include TASK_COMPLETE when finished.
"""

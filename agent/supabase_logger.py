"""
Supabase-based logger.
Drop this into your existing main.py and replace print/logging calls.

Usage in main.py:
    from supabase_logger import AgentLogger
    logger = AgentLogger(task_id=os.environ["TASK_ID"])

    logger.thought("I need to search for the latest React docs.")
    logger.action("browser.goto", url="https://react.dev")
    logger.result("Found documentation. Summarizing…")
    logger.error("Page load failed: timeout")
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from supabase import Client, create_client


class AgentLogger:
    def __init__(self, task_id: str) -> None:
        self.task_id = task_id
        self._client: Client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_KEY"],
        )

    def _insert(self, log_type: str, content: str, metadata: dict | None = None) -> None:
        try:
            self._client.table("logs").insert({
                "task_id":   self.task_id,
                "type":      log_type,
                "content":   content,
                "metadata":  metadata or {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as exc:
            # Never crash the agent because of a logging failure
            print(f"[AgentLogger] Failed to insert log: {exc}")

    def thought(self, content: str, **meta: Any) -> None:
        """Internal chain-of-thought — shown as dim text in the live stream."""
        print(f"💭 {content}")
        self._insert("thought", content, meta or None)

    def action(self, action_name: str, **meta: Any) -> None:
        """Tool call or browser action — shown highlighted."""
        msg = f"{action_name}({', '.join(f'{k}={v!r}' for k, v in meta.items())})"
        print(f"⚡ {msg}")
        self._insert("action", msg, meta or None)

    def result(self, content: str, **meta: Any) -> None:
        """Partial or final result."""
        print(f"✅ {content}")
        self._insert("result", content, meta or None)

    def error(self, content: str, **meta: Any) -> None:
        print(f"❌ {content}")
        self._insert("error", content, meta or None)

    def system(self, content: str, **meta: Any) -> None:
        print(f"🔧 {content}")
        self._insert("system", content, meta or None)

# ──────────────────────────────────────────────────────────────
# GENESIS NODE — DevAgent container
# Runs your main.py --goal "..." and streams logs to Supabase.
# ──────────────────────────────────────────────────────────────
FROM python:3.11-slim-bookworm

# ── System dependencies (Playwright / PyAutoGUI) ──────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
      # Playwright system deps
      libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
      libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
      libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
      libcairo2 libpangocairo-1.0-0 \
      # Virtual display for headless GUI (PyAutoGUI)
      xvfb x11vnc \
      # General utilities
      wget curl git \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ───────────────────────────────────────
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium --with-deps

# ── Source code ───────────────────────────────────────────────
COPY . .

# ── Security: drop to non-root user ──────────────────────────
RUN useradd -m -u 1000 agent && chown -R agent:agent /app /workspace 2>/dev/null || true
USER agent

WORKDIR /workspace

# ── Entrypoint ────────────────────────────────────────────────
# Orchestrator passes: TASK_ID, GOAL, SUPABASE_URL, SUPABASE_KEY, XAI_API_KEY
# main.py reads these from env and reports back via Supabase.
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x800x24 -ac &\n sleep 1\n exec python /app/main.py --goal \"$GOAL\" --task-id \"$TASK_ID\""]

# ──────────────────────────────────────────────────────────────
# GENESIS NODE — Orchestrator container
# ──────────────────────────────────────────────────────────────
FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
      # Docker CLI — lets orchestrator call the Docker socket
      docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Orchestrator needs access to Docker socket (mounted at runtime via -v)
# It does NOT need root itself — just socket access
RUN useradd -m -u 1000 orchestrator \
    && usermod -aG docker orchestrator \
    && chown -R orchestrator:orchestrator /app
USER orchestrator

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:8080/health || exit 1

CMD ["python", "orchestrator.py"]

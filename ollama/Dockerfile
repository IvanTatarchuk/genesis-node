# Genesis Node — Ollama LLM server (free, no API costs)
# Default model: llama3.2:3b (~2GB RAM) — good for analysis and reasoning
# Override via OLLAMA_MODEL env var: llama3.2:1b (fast), qwen2.5:7b (smart)

FROM ollama/ollama:latest

# Default model — can be overridden via Railway env var
ENV OLLAMA_MODEL=llama3.2:3b
ENV OLLAMA_HOST=0.0.0.0

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 11434

HEALTHCHECK --interval=30s --timeout=10s --retries=5 \
  CMD curl -sf http://localhost:11434/api/tags || exit 1

ENTRYPOINT ["/entrypoint.sh"]

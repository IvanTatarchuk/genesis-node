# Genesis Node — Ollama LLM server (free, no API costs)
# Models: llama3.2, mistral — support tool calling

FROM ollama/ollama:latest

ENV OLLAMA_MODEL=llama3.2:3b

# Start ollama, pull model, keep running
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 11434

ENTRYPOINT ["/entrypoint.sh"]

#!/bin/sh
set -e

MODEL="${OLLAMA_MODEL:-llama3.2:3b}"
echo "Starting Ollama server..."

# Start ollama in foreground (Railway will health-check /api/tags)
ollama serve &
OLLAMA_PID=$!

# Wait until ready
sleep 3
until curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 1
done
echo "Ollama server ready. Pulling $MODEL in background..."

# Pull model in background so health check passes immediately
ollama pull "$MODEL" &

echo "Ollama is live on :11434 (model pull in progress)"
wait $OLLAMA_PID

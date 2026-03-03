#!/bin/sh
set -e

# Start ollama serve in background
ollama serve &
OLLAMA_PID=$!

# Wait for server to be ready
sleep 5
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 2
done

# Pull models — smaller for Railway RAM limits (~2GB)
# qwen2.5:0.5b ~400MB, tinyllama ~650MB (both support tool calling)
echo "Pulling qwen2.5:0.5b (text + tools, ~400MB)..."
ollama pull "qwen2.5:0.5b" || true
echo "Pulling llava (vision, ~1.5GB)..."
ollama pull "llava" || true

# Keep ollama in foreground
wait $OLLAMA_PID

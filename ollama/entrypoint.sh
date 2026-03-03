#!/bin/bash
set -e

# Start ollama serve in background
ollama serve &
OLLAMA_PID=$!

# Wait for server to be ready
sleep 5
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 2
done

# Pull models: llama3.2 for text/tools, llava for vision
echo "Pulling llama3.2:3b (text + tool calling)..."
ollama pull "llama3.2:3b" || true
echo "Pulling llava (vision)..."
ollama pull "llava" || true

# Keep ollama in foreground
wait $OLLAMA_PID

# Deploy Ollama to Railway — Step by Step

## Step 1: Create Ollama service on Railway

1. Open https://railway.app/dashboard
2. Open your existing project (де живуть orchestrator, darwin, trinity)
3. Click "+ New Service" → "Empty Service"
4. Name it: "ollama"
5. In "Settings" tab → Source → "Connect GitHub" або "Upload" → вибери папку `ollama/`
   OR: Settings → Source → Deploy from repo root and override root directory to `ollama/`

## Step 2: Configure Ollama service

In Railway → ollama service → Variables tab, add:
  OLLAMA_MODEL = llama3.2:3b    (for quality analysis)
  # or llama3.2:1b for faster/cheaper

In Settings tab:
  - Port: 11434
  - Health check: /api/tags

## Step 3: Get Ollama public URL

After deploy:
  Railway → ollama service → Settings → Networking → Generate Domain
  URL will look like: https://ollama-production-XXXX.up.railway.app

## Step 4: Set OLLAMA_URL on other services

In Railway → orchestrator service → Variables:
  OLLAMA_URL = https://ollama-production-XXXX.up.railway.app
  OLLAMA_MODEL = llama3.2:3b

In Railway → darwin service → Variables (if using LLM):
  OLLAMA_URL = https://ollama-production-XXXX.up.railway.app
  OLLAMA_MODEL = llama3.2:3b

## Step 5: Set on Vercel (for execute-tasks cron)

Run locally:
  npx vercel env add OLLAMA_URL production --value https://ollama-production-XXXX.up.railway.app --yes
  npx vercel env add OLLAMA_MODEL production --value llama3.2:3b --yes

## Important: RAM requirements on Railway

Model              | RAM needed  | Quality
llama3.2:1b       | ~2 GB       | Basic
llama3.2:3b       | ~3-4 GB     | Good (recommended)
qwen2.5:7b        | ~6 GB       | Very good
llama3.1:8b       | ~6-8 GB     | Excellent

Railway Hobby plan gives ~8GB RAM by default — llama3.2:3b works perfectly.

## Startup time

First start: ~5-10 minutes (downloads the model ~2GB)
Subsequent starts: ~30 seconds (model already downloaded via volume)
Add a Railway volume at /root/.ollama to persist the model between deploys!

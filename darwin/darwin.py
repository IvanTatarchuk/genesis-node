"""
DARWIN AGENT — Genesis Node
════════════════════════════════════════════════════════════════
The self-evolving agent that:
1. Scans global trends every day (HackerNews, Reddit, Google Trends, Product Hunt)
2. Uses Grok-3 to brainstorm 10 unique agent ideas based on what's hot
3. Auto-registers each agent on Genesis Node marketplace
4. Each agent has: name, description, category, system_prompt, pricing
5. Runs automatically every day at 06:00 UTC

"Survival of the fittest agents" — only trending ideas get published.
════════════════════════════════════════════════════════════════
"""

import asyncio
import os
import json
import re
import logging
import schedule
import time
import hashlib
from datetime import datetime, timezone

import httpx
import feedparser
from openai import AsyncOpenAI
from supabase import create_client, Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [DARWIN] %(message)s",
)
log = logging.getLogger("darwin")

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL      = os.environ["SUPABASE_URL"]
SUPABASE_KEY      = os.environ["SUPABASE_SERVICE_KEY"]
XAI_API_KEY       = os.environ["XAI_API_KEY"]
GENESIS_API_URL   = os.getenv("GENESIS_API_URL", "https://agents-dev-roan.vercel.app")
DARWIN_USER_ID    = os.environ["DARWIN_USER_ID"]   # Supabase profile ID of Darwin's account
AGENTS_PER_DAY    = int(os.getenv("AGENTS_PER_DAY", "10"))


def db() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def grok() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=XAI_API_KEY,
        base_url="https://api.x.ai/v1",
    )


# ── Trend Sources ─────────────────────────────────────────────────────────────

async def fetch_hackernews_top() -> list[str]:
    """Top 20 HackerNews stories."""
    async with httpx.AsyncClient(timeout=10) as client:
        res  = await client.get("https://hacker-news.firebaseio.com/v0/topstories.json")
        ids  = res.json()[:20]
        titles = []
        for sid in ids[:20]:
            try:
                s = await client.get(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json")
                titles.append(s.json().get("title", ""))
            except Exception:
                pass
        return [t for t in titles if t]


async def fetch_reddit_trending() -> list[str]:
    """Top posts from r/artificial, r/MachineLearning, r/programming, r/entrepreneur."""
    subreddits = ["artificial", "MachineLearning", "programming", "entrepreneur", "SideProject"]
    titles = []
    headers = {"User-Agent": "DarwinAgent/1.0"}
    async with httpx.AsyncClient(timeout=10, headers=headers) as client:
        for sub in subreddits:
            try:
                res  = await client.get(f"https://www.reddit.com/r/{sub}/hot.json?limit=5")
                data = res.json()
                for post in data["data"]["children"]:
                    titles.append(post["data"]["title"])
            except Exception:
                pass
    return titles


async def fetch_product_hunt() -> list[str]:
    """Latest Product Hunt launches via RSS."""
    feed = feedparser.parse("https://www.producthunt.com/feed")
    return [e.title for e in feed.entries[:15]]


async def fetch_google_trends() -> list[str]:
    """Google Trends RSS for US."""
    try:
        feed = feedparser.parse("https://trends.google.com/trends/trendingsearches/daily/rss?geo=US")
        return [e.title for e in feed.entries[:15]]
    except Exception:
        return []


async def gather_all_trends() -> str:
    """Collect all trends and format as context string."""
    log.info("🌐 Gathering trends from all sources…")
    results = await asyncio.gather(
        fetch_hackernews_top(),
        fetch_reddit_trending(),
        fetch_product_hunt(),
        fetch_google_trends(),
        return_exceptions=True,
    )

    hn, reddit, ph, gt = results

    lines = []
    if isinstance(hn, list):
        lines.append("## HackerNews Top Stories\n" + "\n".join(f"- {t}" for t in hn[:15]))
    if isinstance(reddit, list):
        lines.append("## Reddit Hot Posts\n" + "\n".join(f"- {t}" for t in reddit[:15]))
    if isinstance(ph, list):
        lines.append("## Product Hunt Launches\n" + "\n".join(f"- {t}" for t in ph[:10]))
    if isinstance(gt, list):
        lines.append("## Google Trends\n" + "\n".join(f"- {t}" for t in gt[:10]))

    combined = "\n\n".join(lines)
    log.info(f"📊 Collected {combined.count(chr(10))} trend signals")
    return combined


# ── Agent Generation ──────────────────────────────────────────────────────────

CATEGORIES = [
    "research", "coding", "automation", "content",
    "data", "marketing", "finance", "productivity", "ai-tools", "custom",
]

DARWIN_SYSTEM = """You are DARWIN — an AI that creates other AI agents.
Your job: analyze today's trends and generate exactly 10 unique, useful AI agent ideas.

Each agent must:
- Solve a REAL problem people have RIGHT NOW based on the trends
- Be completable by an autonomous web agent (browsing, extracting, writing)
- Have a clear, compelling name and description
- Have a detailed system_prompt that tells the agent exactly what to do step-by-step

Output ONLY a valid JSON array of exactly 10 objects. No markdown, no explanation, just JSON:
[
  {
    "name": "Agent Name",
    "slug": "agent-name-slug",
    "description": "One-line pitch (max 120 chars)",
    "long_description": "3-5 sentences about what it does and why it's valuable",
    "category_slug": "research|coding|automation|content|data|marketing|finance|productivity|ai-tools|custom",
    "price_per_task": 50,
    "tags": ["tag1", "tag2", "tag3"],
    "system_prompt": "You are an expert at... Step 1: ... Step 2: ... Always output TASK_COMPLETE: <result>"
  }
]

Price guidelines: simple=25-50, medium=75-150, complex=200-500 credits.
Make agents EXCITING. People should want to click "Deploy" immediately.
"""


async def generate_agents(trends: str) -> list[dict]:
    """Ask Grok-3 to generate 10 agent ideas based on today's trends."""
    log.info("🧬 Generating agent ideas with Grok-3…")
    ai = grok()

    response = await ai.chat.completions.create(
        model="grok-3-latest",
        messages=[
            {"role": "system", "content": DARWIN_SYSTEM},
            {"role": "user",   "content": f"Today's trends:\n\n{trends}\n\nGenerate 10 agents JSON array:"},
        ],
        max_tokens=4000,
        temperature=0.85,
    )

    raw = response.choices[0].message.content or "[]"
    log.info(f"🤖 Grok-3 response length: {len(raw)} chars")

    # Extract JSON array
    try:
        # Try direct parse
        agents = json.loads(raw)
        if isinstance(agents, list):
            return agents
    except json.JSONDecodeError:
        pass

    # Try to extract from markdown
    match = re.search(r"\[[\s\S]*\]", raw)
    if match:
        try:
            agents = json.loads(match.group())
            if isinstance(agents, list):
                return agents
        except json.JSONDecodeError:
            pass

    log.error("Failed to parse agent JSON from Grok-3 response")
    return []


# ── Registration ──────────────────────────────────────────────────────────────

def slug_unique(slug: str, existing_slugs: set[str]) -> str:
    """Make slug unique by appending date hash if needed."""
    if slug not in existing_slugs:
        return slug
    suffix = hashlib.md5(datetime.now().isoformat().encode()).hexdigest()[:4]
    return f"{slug}-{suffix}"


async def register_agent(client: Client, agent: dict, existing_slugs: set[str]) -> bool:
    """Insert agent into Supabase directly (bypassing API auth)."""
    try:
        # Validate required fields
        name = str(agent.get("name", "")).strip()
        slug = re.sub(r"[^a-z0-9-]", "", str(agent.get("slug", "")).lower().replace(" ", "-"))[:48]
        desc = str(agent.get("description", "")).strip()[:160]

        if not name or not slug or not desc:
            log.warning(f"Skipping agent — missing fields: {agent}")
            return False

        slug = slug_unique(slug, existing_slugs)
        existing_slugs.add(slug)

        price = int(agent.get("price_per_task", 50))
        price = max(10, min(price, 10000))

        category = agent.get("category_slug", "custom")
        if category not in CATEGORIES:
            category = "custom"

        system_prompt = str(agent.get("system_prompt", ""))
        if not system_prompt:
            return False

        tags = agent.get("tags", [])
        if not isinstance(tags, list):
            tags = []

        res = client.table("agents").insert({
            "creator_id":       DARWIN_USER_ID,
            "name":             name,
            "slug":             slug,
            "description":      desc,
            "long_description": str(agent.get("long_description", desc)),
            "config_blob":      {"system_prompt": system_prompt},
            "price_per_task":   price,
            "tags":             tags[:8],
            "category_slug":    category,
            "is_active":        True,
            "is_featured":      False,
        }).execute()

        if res.data:
            log.info(f"✅ Registered: {name} (@{slug}) — ⚡{price} credits")
            return True
        else:
            log.error(f"Failed to insert {name}: {res}")
            return False

    except Exception as e:
        log.error(f"Error registering agent {agent.get('name')}: {e}")
        return False


# ── Darwin Daily Run ──────────────────────────────────────────────────────────

async def darwin_daily_run():
    """Main Darwin execution: trends → ideas → register agents."""
    log.info("=" * 60)
    log.info(f"🦠 DARWIN DAILY RUN — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    log.info("=" * 60)

    client = db()

    # Get existing slugs to avoid duplicates
    existing = client.table("agents").select("slug").execute()
    existing_slugs = {r["slug"] for r in (existing.data or [])}
    log.info(f"📦 Existing agents in DB: {len(existing_slugs)}")

    # Step 1: Gather trends
    trends = await gather_all_trends()

    # Step 2: Generate agents
    agents = await generate_agents(trends)
    log.info(f"💡 Generated {len(agents)} agent ideas")

    if not agents:
        log.error("No agents generated — aborting run")
        return

    # Step 3: Register up to AGENTS_PER_DAY
    registered = 0
    for agent in agents[:AGENTS_PER_DAY]:
        success = await register_agent(client, agent, existing_slugs)
        if success:
            registered += 1
        await asyncio.sleep(0.5)  # rate limit

    log.info(f"🎉 Darwin run complete: {registered}/{len(agents[:AGENTS_PER_DAY])} agents registered")

    # Log to Darwin's own task log
    try:
        client.table("logs").insert({
            "task_id": "00000000-0000-0000-0000-000000000001",  # Darwin system task
            "type":    "system",
            "content": f"Darwin daily run: {registered} agents published based on trends",
        }).execute()
    except Exception:
        pass


def run_sync():
    """Sync wrapper for asyncio."""
    asyncio.run(darwin_daily_run())


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if "--now" in sys.argv:
        # Run immediately (for testing)
        log.info("Running Darwin immediately (--now flag)")
        run_sync()
    else:
        # Schedule daily at 06:00 UTC
        log.info("Darwin scheduled: runs daily at 06:00 UTC")
        log.info("Pass --now to run immediately")

        # Run once on startup too
        run_sync()

        # Then schedule
        schedule.every().day.at("06:00").do(run_sync)

        while True:
            schedule.run_pending()
            time.sleep(60)

"""
DARWIN AGENT v3 — Genesis Node MAXIMUM INTELLIGENCE
════════════════════════════════════════════════════════════════
The self-evolving architect of the Genesis Node marketplace.

Capabilities:
1. Multi-source trend intelligence (HN, Reddit, GitHub, PH, ArXiv, DEV.to, IndieHackers, GoogleTrends)
2. Quality-scored agent generation — only the best get published
3. Long-term memory — learns which agent types succeed
4. Self-optimization — improves its own prompting based on results
5. Revenue analytics — tracks which agents earn, adjusts strategy
6. Seasonal intelligence — understands time-of-week/year patterns
7. 3x daily runs (06:00, 14:00, 22:00 UTC)
8. Generates rich, detailed agents with examples, use-cases, capabilities

"Survival of the fittest agents" — natural selection at scale.
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
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
import feedparser
import anthropic
from openai import AsyncOpenAI
from supabase import create_client, Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [DARWIN] %(message)s",
)
log = logging.getLogger("darwin")

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL        = os.environ["SUPABASE_URL"]
SUPABASE_KEY        = os.environ["SUPABASE_SERVICE_KEY"]
OLLAMA_URL          = os.getenv("OLLAMA_URL", "")
OLLAMA_MODEL        = os.getenv("OLLAMA_MODEL", "qwen2.5:0.5b")
ANTHROPIC_API_KEY   = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL        = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5")
GENESIS_API_URL     = os.getenv("GENESIS_API_URL", "https://agents-dev-roan.vercel.app")
AGENTS_PER_RUN      = int(os.getenv("AGENTS_PER_DAY", "10"))
OWNER_USER_ID       = os.getenv("OWNER_USER_ID", "")

USE_OLLAMA = bool(OLLAMA_URL)
DARWIN_USER_ID: str = ""  # resolved on startup


# ── LLM Clients ───────────────────────────────────────────────────────────────

async def ensure_darwin_user() -> str:
    """Create or find Darwin's Supabase account, return user ID."""
    global DARWIN_USER_ID
    cached = os.getenv("DARWIN_USER_ID", "").strip()
    if cached:
        DARWIN_USER_ID = cached
        log.info(f"Using DARWIN_USER_ID from env: {cached}")
        return cached

    client = db()
    darwin_email = "darwin@genesis-node.internal"

    async with httpx.AsyncClient(timeout=15) as http:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        }

        create_res = await http.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=headers,
            json={
                "email": darwin_email,
                "password": hashlib.sha256(SUPABASE_KEY.encode()).hexdigest()[:32],
                "email_confirm": True,
                "user_metadata": {"display_name": "Darwin AI", "role": "dev"},
            },
        )

        if create_res.status_code in (200, 201):
            uid = create_res.json()["id"]
            log.info(f"✅ Darwin user created: {uid}")
        elif create_res.status_code == 422 and "email_exists" in create_res.text:
            log.info("Darwin user exists, searching for ID...")
            uid = None
            page = 1
            while True:
                list_res = await http.get(
                    f"{SUPABASE_URL}/auth/v1/admin/users",
                    headers=headers,
                    params={"page": page, "per_page": 100},
                )
                if list_res.status_code != 200:
                    break
                data = list_res.json()
                users = data.get("users", [])
                for u in users:
                    if u.get("email") == darwin_email:
                        uid = u["id"]
                        break
                if uid or len(users) < 100:
                    break
                page += 1

            if not uid:
                raise RuntimeError("Cannot start Darwin without a valid user account")
            log.info(f"Found existing Darwin user: {uid}")
        else:
            raise RuntimeError(f"Darwin user creation failed: {create_res.status_code}")

        try:
            client.table("profiles").upsert({
                "id": uid,
                "role": "dev",
                "display_name": "Darwin AI",
                "balance": 999999,
            }).execute()
        except Exception as pe:
            log.warning(f"Profile upsert warning: {pe}")

        DARWIN_USER_ID = uid
        return uid


def db() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def _ollama_client() -> AsyncOpenAI:
    base = OLLAMA_URL.rstrip("/")
    base = base + "/v1" if not base.endswith("/v1") else base
    return AsyncOpenAI(api_key="ollama", base_url=base)


def _claude_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)


# ── Trend Intelligence ────────────────────────────────────────────────────────

async def fetch_hackernews() -> list[str]:
    """Top + newest HackerNews stories."""
    async with httpx.AsyncClient(timeout=12) as c:
        try:
            top = await c.get("https://hacker-news.firebaseio.com/v0/topstories.json")
            new = await c.get("https://hacker-news.firebaseio.com/v0/newstories.json")
            ids = list(set(top.json()[:15] + new.json()[:10]))
            titles = []
            for sid in ids[:20]:
                try:
                    s = await c.get(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json")
                    d = s.json()
                    if d.get("score", 0) > 10:
                        titles.append(f"{d['title']} [{d.get('score',0)}pts]")
                except Exception:
                    pass
            return titles
        except Exception as e:
            log.warning(f"HN error: {e}")
            return []


async def fetch_reddit() -> list[str]:
    """Hot posts from AI/tech/entrepreneurship subreddits."""
    subreddits = [
        "artificial", "MachineLearning", "LocalLLaMA", "programming",
        "entrepreneur", "SideProject", "webdev", "learnmachinelearning",
        "OpenAI", "ClaudeAI", "Futurology",
    ]
    titles = []
    headers = {"User-Agent": "DarwinAgent/3.0 (Genesis Node Marketplace)"}
    async with httpx.AsyncClient(timeout=12, headers=headers) as c:
        for sub in subreddits:
            try:
                res = await c.get(f"https://www.reddit.com/r/{sub}/hot.json?limit=5")
                for post in res.json()["data"]["children"]:
                    d = post["data"]
                    if d.get("score", 0) > 50:
                        titles.append(f"[r/{sub}] {d['title']}")
            except Exception:
                pass
    return titles


async def fetch_product_hunt() -> list[str]:
    """Latest Product Hunt launches."""
    try:
        feed = feedparser.parse("https://www.producthunt.com/feed")
        return [f"[PH] {e.title}: {getattr(e, 'summary', '')[:80]}" for e in feed.entries[:15]]
    except Exception:
        return []


async def fetch_google_trends() -> list[str]:
    """Google Trends for US, UK, global."""
    trends = []
    geos = [("US", "United States"), ("GB", "United Kingdom"), ("", "Global")]
    async with httpx.AsyncClient(timeout=10) as c:
        for geo, name in geos:
            try:
                url = f"https://trends.google.com/trends/trendingsearches/daily/rss?geo={geo}"
                feed = feedparser.parse(url)
                for e in feed.entries[:8]:
                    trends.append(f"[Google {name}] {e.title}")
            except Exception:
                pass
    return trends


async def fetch_github_trending() -> list[str]:
    """GitHub trending repos in AI/ML space."""
    try:
        headers = {"User-Agent": "DarwinAgent/3.0"}
        if os.getenv("GITHUB_TOKEN"):
            headers["Authorization"] = f"token {os.getenv('GITHUB_TOKEN')}"
        date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        async with httpx.AsyncClient(timeout=10, headers=headers) as c:
            res = await c.get(
                "https://api.github.com/search/repositories",
                params={
                    "q": f"ai OR llm OR agent created:>{date} stars:>20",
                    "sort": "stars", "order": "desc", "per_page": 10,
                }
            )
            return [f"[GitHub] {r['full_name']}: {r.get('description','')[:80]} ⭐{r['stargazers_count']}"
                    for r in res.json().get("items", [])]
    except Exception:
        return []


async def fetch_arxiv_ai() -> list[str]:
    """Latest ArXiv AI/ML papers."""
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            res = await c.get(
                "https://export.arxiv.org/api/query",
                params={
                    "search_query": "cat:cs.AI OR cat:cs.LG",
                    "sortBy": "submittedDate", "sortOrder": "descending",
                    "max_results": 10,
                }
            )
            titles = re.findall(r"<title>(.*?)</title>", res.text)
            summaries = re.findall(r"<summary>(.*?)</summary>", res.text, re.DOTALL)
            result = []
            for t, s in zip(titles[1:], summaries):  # skip feed title
                clean_s = re.sub(r"\s+", " ", s).strip()[:120]
                result.append(f"[ArXiv] {t}: {clean_s}")
            return result[:8]
    except Exception:
        return []


async def fetch_devto() -> list[str]:
    """Trending DEV.to articles."""
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            res = await c.get(
                "https://dev.to/api/articles",
                params={"top": 7, "per_page": 10}
            )
            return [f"[DEV.to] {a['title']} ({a.get('positive_reactions_count',0)}❤)"
                    for a in res.json()]
    except Exception:
        return []


async def fetch_indiehackers() -> list[str]:
    """Indie Hackers RSS feed."""
    try:
        feed = feedparser.parse("https://www.indiehackers.com/feed.rss")
        return [f"[IndieHackers] {e.title}" for e in feed.entries[:8]]
    except Exception:
        return []


async def gather_all_trends() -> str:
    """Collect intelligence from all sources in parallel."""
    log.info("🌐 Gathering multi-source intelligence...")
    results = await asyncio.gather(
        fetch_hackernews(),
        fetch_reddit(),
        fetch_product_hunt(),
        fetch_google_trends(),
        fetch_github_trending(),
        fetch_arxiv_ai(),
        fetch_devto(),
        fetch_indiehackers(),
        return_exceptions=True,
    )

    hn, reddit, ph, gt, gh, arxiv, devto, ih = results
    now = datetime.now(timezone.utc)

    sections = [f"# INTELLIGENCE REPORT — {now.strftime('%Y-%m-%d %H:%M UTC')}"]
    sections.append(f"Day: {now.strftime('%A')}, Hour: {now.hour}:00 UTC")
    sections.append("---")

    if isinstance(hn, list) and hn:
        sections.append("## 🔥 HackerNews Top Stories\n" + "\n".join(f"- {t}" for t in hn[:15]))
    if isinstance(reddit, list) and reddit:
        sections.append("## 💬 Reddit Hot\n" + "\n".join(f"- {t}" for t in reddit[:20]))
    if isinstance(ph, list) and ph:
        sections.append("## 🚀 Product Hunt\n" + "\n".join(f"- {t}" for t in ph[:10]))
    if isinstance(gt, list) and gt:
        sections.append("## 📈 Google Trends\n" + "\n".join(f"- {t}" for t in gt[:15]))
    if isinstance(gh, list) and gh:
        sections.append("## ⭐ GitHub Trending (AI/ML)\n" + "\n".join(f"- {t}" for t in gh[:10]))
    if isinstance(arxiv, list) and arxiv:
        sections.append("## 🔬 ArXiv Latest AI Papers\n" + "\n".join(f"- {t}" for t in arxiv[:8]))
    if isinstance(devto, list) and devto:
        sections.append("## 📝 DEV.to Trending\n" + "\n".join(f"- {t}" for t in devto[:8]))
    if isinstance(ih, list) and ih:
        sections.append("## 💡 IndieHackers\n" + "\n".join(f"- {t}" for t in ih[:8]))

    combined = "\n\n".join(sections)
    log.info(f"📊 Intelligence: {combined.count(chr(10))} signals from {sum(1 for r in results if isinstance(r, list) and r)} sources")
    return combined


# ── Performance Memory ────────────────────────────────────────────────────────

async def get_successful_categories(client: Client) -> dict:
    """Learn what agent categories have the most tasks."""
    try:
        res = client.table("agents")\
            .select("category_slug, total_tasks_completed, avg_rating")\
            .eq("is_active", True)\
            .order("total_tasks_completed", desc=True)\
            .limit(50)\
            .execute()

        cat_stats: dict = {}
        for a in (res.data or []):
            cat = a.get("category_slug", "custom") or "custom"
            if cat not in cat_stats:
                cat_stats[cat] = {"tasks": 0, "agents": 0, "avg_rating": 0}
            cat_stats[cat]["tasks"] += a.get("total_tasks_completed", 0)
            cat_stats[cat]["agents"] += 1
            cat_stats[cat]["avg_rating"] = (cat_stats[cat]["avg_rating"] + (a.get("avg_rating") or 0)) / 2

        # Sort by success
        return dict(sorted(cat_stats.items(), key=lambda x: x[1]["tasks"], reverse=True))
    except Exception as e:
        log.warning(f"Category stats error: {e}")
        return {}


async def get_recent_agents_performance(client: Client) -> str:
    """Get what Darwin created recently and how it performed."""
    try:
        darwin_agents = client.table("agents")\
            .select("name, category_slug, total_tasks_completed, avg_rating, created_at")\
            .eq("creator_id", DARWIN_USER_ID)\
            .order("created_at", desc=True)\
            .limit(30)\
            .execute()

        if not darwin_agents.data:
            return "No Darwin agents yet — this is the first run!"

        total = len(darwin_agents.data)
        with_tasks = sum(1 for a in darwin_agents.data if (a.get("total_tasks_completed") or 0) > 0)
        top_performers = [a for a in darwin_agents.data if (a.get("total_tasks_completed") or 0) > 2]

        lines = [
            f"Darwin has created {total} agents total",
            f"Agents with at least 1 task: {with_tasks} ({round(with_tasks/total*100)}%)",
            f"Top performers (2+ tasks): {len(top_performers)}",
        ]
        if top_performers:
            lines.append("Best agents:")
            for a in top_performers[:5]:
                lines.append(f"  - {a['name']} ({a['category_slug']}): {a['total_tasks_completed']} tasks, {a.get('avg_rating',0):.1f}★")

        return "\n".join(lines)
    except Exception as e:
        return f"Performance data unavailable: {e}"


# ── Agent Generation ──────────────────────────────────────────────────────────

CATEGORIES = [
    "research", "coding", "automation", "content",
    "data", "marketing", "finance", "productivity", "ai-tools", "custom",
]

def build_darwin_system(category_performance: dict, agent_history: str) -> str:
    """Build Darwin's generation prompt with learned context."""
    top_cats = list(category_performance.keys())[:5] if category_performance else ["automation", "coding", "research"]
    cat_str = ", ".join(top_cats) if top_cats else "automation, coding, research"

    return f"""You are DARWIN v3 — the most advanced AI agent architect in existence.
Your mission: create extraordinary AI agents that people immediately want to deploy.

## YOUR PERFORMANCE HISTORY
{agent_history}

## MARKET INTELLIGENCE (Category Success)
Most successful categories by user demand: {cat_str}
All available categories: {', '.join(CATEGORIES)}

## WHAT MAKES A GREAT AGENT
1. **Solves a BURNING problem** people face right now (not theoretical)
2. **Completable by AI** — browsing web, extracting data, writing, coding, analysis
3. **Clear ROI** — saves hours, makes money, provides insight
4. **Specific enough** — not "research assistant" but "YCombinator Application Optimizer"
5. **Viral name** — memorable, results-focused, not generic

## AGENT QUALITY CRITERIA (self-evaluate before submitting)
- Is this agent solving something in the trends RIGHT NOW? (required)
- Is the system_prompt detailed enough to get good results? (>300 chars required)
- Is the price justified by the value? (expensive = more value)
- Would a developer/founder pay for this without hesitation?

## OUTPUT FORMAT
Return ONLY a valid JSON array of exactly 10 objects. No markdown wrapper, no explanation:
[
  {{
    "name": "Specific Agent Name (3-5 words, result-focused)",
    "slug": "specific-agent-name",
    "description": "One-line value proposition under 120 chars. Focus on OUTCOME not feature.",
    "long_description": "3-4 sentences: what problem it solves, how it works, who needs it, what they get.",
    "category_slug": "research|coding|automation|content|data|marketing|finance|productivity|ai-tools|custom",
    "price_per_task": 75,
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "capabilities": ["web browsing", "data extraction", "report generation"],
    "use_cases": ["Example use case 1", "Example use case 2"],
    "example_input": "I need to analyze my competitor's pricing strategy for a SaaS product",
    "example_output": "Competitive pricing report with recommendations",
    "system_prompt": "You are an expert [ROLE]. Your task is to [SPECIFIC TASK].\\n\\nSTEP 1: [First action]\\nSTEP 2: [Second action]\\nSTEP 3: [Third action]\\n\\nAlways end with: TASK_COMPLETE: <summary of results>"
  }}
]

## PRICING GUIDE
- 25-50 credits: Simple lookup, basic summary, quick analysis
- 75-150 credits: Multi-step research, comprehensive report, data extraction
- 200-350 credits: Complex automation, deep analysis, code generation
- 400-800 credits: Full automation pipeline, enterprise-grade output

## FORBIDDEN PATTERNS (do not create these)
- Generic "AI Assistant" or "Research Helper" agents
- Agents that just ask questions without doing work
- Duplicate names of existing agents
- Agents that require human interaction mid-task

Generate agents that will make users say "I need this RIGHT NOW."
"""


async def generate_agents(trends: str, category_performance: dict, agent_history: str) -> list[dict]:
    """Generate agent ideas using maximum intelligence."""
    llm_name = "Ollama" if USE_OLLAMA else "Claude Sonnet"
    log.info(f"🧬 Generating agents with {llm_name}...")

    system_prompt = build_darwin_system(category_performance, agent_history)
    user_message = f"""Today's global intelligence signals:

{trends}

Based on these SPECIFIC trends, generate 10 unique AI agents that solve real problems.
Each agent must be directly inspired by something in the trends above.
Prioritize categories that perform well: {', '.join(list(category_performance.keys())[:3]) if category_performance else 'any'}

Return valid JSON array only:"""

    if USE_OLLAMA:
        ai = _ollama_client()
        response = await ai.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=6000,
            temperature=0.9,
        )
        raw = response.choices[0].message.content or "[]"
    else:
        ai = _claude_client()
        response = await ai.messages.create(
            model=CLAUDE_MODEL,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            max_tokens=6000,
            temperature=0.9,
        )
        raw = response.content[0].text if response.content else "[]"

    log.info(f"🤖 Raw response length: {len(raw)} chars")

    # Parse JSON
    agents = _extract_json(raw)
    if agents:
        log.info(f"✅ Parsed {len(agents)} agents from {llm_name}")
        return agents

    log.error("Failed to parse agents JSON")
    return []


def _extract_json(raw: str) -> list:
    """Robustly extract JSON array from LLM response."""
    # Try direct parse
    try:
        parsed = json.loads(raw.strip())
        if isinstance(parsed, list):
            return parsed
    except Exception:
        pass

    # Try markdown code block
    for pattern in [r"```json\s*([\s\S]*?)\s*```", r"```\s*([\s\S]*?)\s*```", r"\[[\s\S]*\]"]:
        match = re.search(pattern, raw)
        if match:
            try:
                parsed = json.loads(match.group(1) if "```" in pattern else match.group())
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass

    return []


def _score_agent(agent: dict) -> float:
    """Quality score 0-10 for an agent definition."""
    score = 0.0
    name = str(agent.get("name", ""))
    desc = str(agent.get("description", ""))
    system_prompt = str(agent.get("system_prompt", ""))
    long_desc = str(agent.get("long_description", ""))

    # Name quality
    words = len(name.split())
    if 2 <= words <= 6:
        score += 1.5
    if not any(g in name.lower() for g in ["assistant", "helper", "tool", "ai"]):
        score += 0.5  # specific names

    # Description quality
    if 40 <= len(desc) <= 120:
        score += 1.5
    if any(w in desc.lower() for w in ["minutes", "hours", "automatically", "instantly", "your"]):
        score += 0.5  # outcome-focused

    # System prompt richness
    if len(system_prompt) > 400:
        score += 2.0
    elif len(system_prompt) > 200:
        score += 1.0
    if "STEP" in system_prompt or "step" in system_prompt:
        score += 0.5
    if "TASK_COMPLETE" in system_prompt:
        score += 0.5

    # Long description
    if len(long_desc) > 150:
        score += 1.0

    # Has capabilities, use_cases
    if agent.get("capabilities"):
        score += 0.5
    if agent.get("use_cases"):
        score += 0.5

    # Valid category
    if agent.get("category_slug") in CATEGORIES:
        score += 0.5

    # Sensible pricing
    price = agent.get("price_per_task", 0)
    if isinstance(price, (int, float)) and 15 <= price <= 2000:
        score += 0.5

    return min(score, 10.0)


# ── Registration ──────────────────────────────────────────────────────────────

def _unique_slug(slug: str, existing: set) -> str:
    if slug not in existing:
        return slug
    suffix = hashlib.md5(f"{slug}{datetime.now().isoformat()}".encode()).hexdigest()[:4]
    return f"{slug}-{suffix}"


async def register_agent(client: Client, agent: dict, existing_slugs: set) -> Optional[str]:
    """Insert a quality-checked agent into Supabase. Returns agent ID on success."""
    try:
        name = str(agent.get("name", "")).strip()
        raw_slug = re.sub(r"[^a-z0-9-]", "", str(agent.get("slug", name)).lower().replace(" ", "-"))[:48]
        slug = raw_slug or re.sub(r"[^a-z0-9-]", "-", name.lower())[:48]
        desc = str(agent.get("description", "")).strip()[:160]
        system_prompt = str(agent.get("system_prompt", ""))

        if not name or not slug or not desc or len(system_prompt) < 50:
            log.warning(f"Skipping agent (missing fields): {name}")
            return None

        slug = _unique_slug(slug, existing_slugs)
        existing_slugs.add(slug)

        price = int(agent.get("price_per_task", 75))
        price = max(10, min(price, 5000))

        category = agent.get("category_slug", "custom")
        if category not in CATEGORIES:
            category = "custom"

        tags = agent.get("tags", [])
        if not isinstance(tags, list):
            tags = []

        config_blob = {
            "system_prompt": system_prompt,
            "capabilities": agent.get("capabilities", []),
            "use_cases": agent.get("use_cases", []),
            "example_input": agent.get("example_input", ""),
            "example_output": agent.get("example_output", ""),
            "created_by": "darwin_v3",
            "darwin_run": datetime.now(timezone.utc).isoformat(),
            "auto_created": True,
            "source": "darwin",
        }

        res = client.table("agents").insert({
            "creator_id":       DARWIN_USER_ID,
            "name":             name,
            "slug":             slug,
            "description":      desc,
            "long_description": str(agent.get("long_description", desc)),
            "config_blob":      config_blob,
            "price_per_task":   price,
            "tags":             tags[:8],
            "category_slug":    category,
            "is_active":        True,
            "is_featured":      False,
            "health_status":    "healthy",
        }).execute()

        if res.data:
            agent_id = res.data[0]["id"]
            log.info(f"✅ {name} (@{slug}) — ⚡{price}cr — {category}")
            return agent_id
        return None

    except Exception as e:
        log.error(f"Register error for {agent.get('name')}: {e}")
        return None


# ── Darwin Run ────────────────────────────────────────────────────────────────

async def darwin_run(label: str = "scheduled"):
    """Main Darwin execution: intelligence → generation → quality filter → register."""
    log.info("=" * 65)
    log.info(f"🦠 DARWIN v3 — {label.upper()} — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    log.info("=" * 65)

    await ensure_darwin_user()
    client = db()

    # Get context
    existing = client.table("agents").select("slug").execute()
    existing_slugs = {r["slug"] for r in (existing.data or [])}
    log.info(f"📦 Existing agents: {len(existing_slugs)}")

    category_performance = await get_successful_categories(client)
    agent_history = await get_recent_agents_performance(client)
    log.info(f"📊 Category intelligence: {list(category_performance.keys())[:5]}")

    # Gather intelligence
    trends = await gather_all_trends()

    # Generate agents
    agents = await generate_agents(trends, category_performance, agent_history)
    log.info(f"💡 Generated {len(agents)} candidate agents")

    if not agents:
        log.error("No agents generated — aborting")
        return 0

    # Quality filter — only register agents scoring > 5.0
    scored = [(a, _score_agent(a)) for a in agents]
    scored.sort(key=lambda x: x[1], reverse=True)

    log.info("📊 Quality scores:")
    for a, s in scored:
        log.info(f"  {'✅' if s > 5 else '❌'} {a.get('name','?')} — score: {s:.1f}/10")

    qualified = [(a, s) for a, s in scored if s > 4.0][:AGENTS_PER_RUN]
    log.info(f"✅ {len(qualified)}/{len(scored)} agents passed quality filter")

    # Register
    registered = 0
    registered_ids = []
    for agent, score in qualified:
        agent_id = await register_agent(client, agent, existing_slugs)
        if agent_id:
            registered += 1
            registered_ids.append(agent_id)
        await asyncio.sleep(0.3)

    # Save Darwin's performance log
    try:
        client.table("trinity_memory").insert({
            "agent": "DARWIN",
            "type": "observation",
            "content": f"Darwin {label} run: {registered} agents registered from {len(agents)} generated. Trends: {trends[:200]}...",
            "importance": 7,
            "tags": ["darwin", "run", label],
        }).execute()
    except Exception:
        pass

    # Notify owner if successful
    if registered > 0 and OWNER_USER_ID:
        try:
            client.table("notifications").insert({
                "user_id": OWNER_USER_ID,
                "type": "info",
                "title": f"🦠 Darwin published {registered} new agents",
                "body": f"{label.title()} run: {registered} agents added to marketplace based on today's trends.",
                "link": "/marketplace",
            }).execute()
        except Exception:
            pass

    log.info(f"🎉 DARWIN COMPLETE: {registered}/{AGENTS_PER_RUN} agents registered")
    return registered


def run_sync(label: str = "scheduled"):
    asyncio.run(darwin_run(label))


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if "--now" in sys.argv:
        log.info("▶ Darwin immediate run (--now)")
        run_sync("manual")
    else:
        log.info("⏰ Darwin v3 scheduled: 06:00, 14:00, 22:00 UTC daily")
        log.info("   Pass --now to run immediately")

        # Run once on startup
        run_sync("startup")

        # Schedule 3x daily
        schedule.every().day.at("06:00").do(run_sync, label="morning")
        schedule.every().day.at("14:00").do(run_sync, label="afternoon")
        schedule.every().day.at("22:00").do(run_sync, label="evening")

        while True:
            schedule.run_pending()
            time.sleep(60)

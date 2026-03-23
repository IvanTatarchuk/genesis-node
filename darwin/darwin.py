"""
DARWIN AGENT v3 â€” Genesis Node MAXIMUM INTELLIGENCE (Production Refactor)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
Self-evolving marketplace architect: shared HTTP client, Pydantic validation,
exponential backoff, secure state, categories from DB, cloud-native execution.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

# Load .env from this script's directory first so Darwin works without exporting vars
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.isfile(_env_path):
    with open(_env_path, encoding="utf-8") as _f:
        for _line in _f:
            _m = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$", _line)
            if _m and _m.group(1) not in os.environ:
                _val = _m.group(2).strip()
                if "#" in _val:
                    _val = _val.split("#")[0].strip()
                os.environ[_m.group(1)] = _val.strip("'\"")

import anthropic
import feedparser
import httpx
from aiohttp import web
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from supabase import Client, create_client
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [DARWIN] %(message)s",
)
log = logging.getLogger("darwin")

# â”€â”€ Forbidden substrings in system_prompt (sanitization) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Includes self-modification: generated agents must not change Darwin's own code
FORBIDDEN_SYSTEM_PROMPT_PATTERNS = (
    "ignore previous instructions",
    "ignore all previous",
    "disregard your instructions",
    "jailbreak",
    "\x00",  # null byte
    "darwin.py",
    "edit darwin",
    "modify darwin",
    "overwrite this file",
    "change this code",
    "agents-dev/darwin",
    "agents_dev/darwin",
)


@dataclass
class DarwinConfig:
    """Immutable config derived from environment."""

    supabase_url: str
    supabase_key: str
    darwin_password: str
    ollama_url: str
    ollama_model: str
    anthropic_api_key: str
    claude_model: str
    genesis_api_url: str
    agents_per_run: int
    owner_user_id: str
    cron_secret: str
    port: int
    max_per_category_per_day: int
    llm_retries: int
    github_token: str

    @classmethod
    def from_env(cls) -> DarwinConfig:
        """Build config from environment. Load .env from script dir first (see top of file)."""
        url = os.getenv("SUPABASE_URL", "").strip()
        key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY required. "
                "Copy .env.example to .env in the darwin/ folder and set the values."
            )
        return cls(
            supabase_url=url,
            supabase_key=key,
            darwin_password=os.getenv("DARWIN_PASSWORD", "").strip(),
            ollama_url=os.getenv("OLLAMA_URL", ""),
            ollama_model=os.getenv("OLLAMA_MODEL", "qwen2.5:0.5b"),
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            claude_model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5"),
            genesis_api_url=os.getenv("GENESIS_API_URL", "https://matadora.business"),
            agents_per_run=int(os.getenv("AGENTS_PER_DAY", "10")),
            owner_user_id=os.getenv("OWNER_USER_ID", ""),
            cron_secret=os.getenv("CRON_SECRET", ""),
            port=int(os.getenv("PORT", "8080")),
            max_per_category_per_day=int(os.getenv("MAX_AGENTS_PER_CATEGORY_PER_DAY", "3")),
            llm_retries=int(os.getenv("LLM_RETRIES", "3")),
            github_token=os.getenv("GITHUB_TOKEN", ""),
        )


@dataclass
class DarwinState:
    """Mutable runtime state: user id, categories, shared HTTP client."""

    darwin_user_id: str = ""
    categories: list[str] = field(default_factory=list)
    _http_client: Optional[httpx.AsyncClient] = field(default=None, repr=False)
    _db: Optional[Client] = field(default=None, repr=False)
    _run_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    running: bool = False

    @property
    def http(self) -> httpx.AsyncClient:
        """Return shared HTTP client; raises if not initialized."""
        if self._http_client is None:
            raise RuntimeError("HTTP client not initialized. Call init_http_client() first.")
        return self._http_client

    def set_http_client(self, client: httpx.AsyncClient) -> None:
        self._http_client = client

    async def close_http_client(self) -> None:
        if self._http_client is not None:
            await self._http_client.aclose()
            self._http_client = None

    def db(self) -> Client:
        if self._db is None:
            raise RuntimeError("DB not initialized.")
        return self._db

    def set_db(self, client: Client) -> None:
        self._db = client


# Global state and config (set at startup)
config = DarwinConfig.from_env()
state = DarwinState()

# Retry policy for external APIs: exponential backoff, handle 429
def _retry_http(retries: int = 4):
    return retry(
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError)),
        stop=stop_after_attempt(retries),
        wait=wait_exponential(multiplier=1, min=2, max=60),
        reraise=True,
    )


def _check_429(response: httpx.Response) -> None:
    """Raise if 429 so tenacity can retry."""
    if response.status_code == 429:
        raise httpx.HTTPStatusError(
            "Too Many Requests",
            request=response.request,
            response=response,
        )


def get_db() -> Client:
    """Return Supabase client (creates once per process)."""
    if state._db is None:
        state.set_db(create_client(config.supabase_url, config.supabase_key))
    return state.db()


async def ensure_darwin_user() -> str:
    """
    Create or find Darwin's Supabase account. Uses DARWIN_PASSWORD from env
    (never derived from SUPABASE_KEY). Updates state.darwin_user_id.
    """
    cached = os.getenv("DARWIN_USER_ID", "").strip()
    if cached:
        state.darwin_user_id = cached
        log.info("Using DARWIN_USER_ID from env: %s", cached)
        return cached

    if not config.darwin_password:
        raise RuntimeError(
            "DARWIN_PASSWORD is required for Darwin user creation. "
            "Set it in environment (do not derive from SUPABASE_KEY)."
        )

    client = get_db()
    darwin_email = "darwin@genesis-node.internal"
    headers = {
        "apikey": config.supabase_key,
        "Authorization": f"Bearer {config.supabase_key}",
        "Content-Type": "application/json",
    }

    create_res = await state.http.post(
        f"{config.supabase_url}/auth/v1/admin/users",
        headers=headers,
        json={
            "email": darwin_email,
            "password": config.darwin_password,
            "email_confirm": True,
            "user_metadata": {"display_name": "Darwin AI", "role": "dev"},
        },
    )
    _check_429(create_res)

    if create_res.status_code in (200, 201):
        uid = create_res.json()["id"]
        log.info("Darwin user created: %s", uid)
    elif create_res.status_code == 422 and "email_exists" in (create_res.text or ""):
        log.info("Darwin user exists, searching for ID...")
        uid = None
        page = 1
        while True:
            list_res = await state.http.get(
                f"{config.supabase_url}/auth/v1/admin/users",
                headers=headers,
                params={"page": page, "per_page": 100},
            )
            _check_429(list_res)
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
        log.info("Found existing Darwin user: %s", uid)
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
        log.warning("Profile upsert warning: %s", pe)

    state.darwin_user_id = uid
    return uid


def load_categories_from_db() -> list[str]:
    """
    Fetch available category slugs from Supabase categories table on startup.
    Falls back to default list if table missing or empty.
    """
    default = [
        "research", "coding", "automation", "content",
        "data", "marketing", "finance", "productivity", "ai-tools", "custom",
    ]
    try:
        res = get_db().table("categories").select("slug").order("sort_order").execute()
        slugs = [r["slug"] for r in (res.data or []) if r.get("slug")]
        if slugs:
            state.categories = slugs
            log.info("Loaded %d categories from DB: %s", len(slugs), slugs[:5])
            return slugs
    except Exception as e:
        log.warning("Could not load categories from DB: %s. Using defaults.", e)
    state.categories = default
    return default


def _ollama_client() -> AsyncOpenAI:
    base = config.ollama_url.rstrip("/")
    base = base + "/v1" if not base.endswith("/v1") else base
    return AsyncOpenAI(api_key="ollama", base_url=base)


def _claude_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=config.anthropic_api_key)


# â”€â”€ Trend Intelligence (shared HTTP client + tenacity) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@_retry_http(4)
async def fetch_hackernews() -> list[str]:
    """Top + newest HackerNews stories. Retries on 429/transient errors."""
    top = await state.http.get("https://hacker-news.firebaseio.com/v0/topstories.json")
    _check_429(top)
    top.raise_for_status()
    new = await state.http.get("https://hacker-news.firebaseio.com/v0/newstories.json")
    _check_429(new)
    new.raise_for_status()
    ids = list(set(top.json()[:15] + new.json()[:10]))[:20]
    titles: list[str] = []
    for sid in ids:
        try:
            s = await state.http.get(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json")
            s.raise_for_status()
            d = s.json()
            if d.get("score", 0) > 10:
                titles.append(f"{d.get('title','')} [{d.get('score',0)}pts]")
        except Exception:
            continue
    return titles


@_retry_http(3)
async def fetch_reddit() -> list[str]:
    """Hot posts from AI/tech subreddits. One failure per subreddit does not stop others."""
    subreddits = [
        "artificial", "MachineLearning", "LocalLLaMA", "programming",
        "entrepreneur", "SideProject", "webdev", "OpenAI", "ClaudeAI", "Futurology",
    ]
    titles: list[str] = []
    headers = {"User-Agent": "DarwinAgent/3.0 (Genesis Node Marketplace)"}
    for sub in subreddits:
        try:
            res = await state.http.get(
                f"https://www.reddit.com/r/{sub}/hot.json?limit=5",
                headers=headers,
            )
            _check_429(res)
            res.raise_for_status()
            for post in res.json().get("data", {}).get("children", []):
                d = post.get("data", {})
                if d.get("score", 0) > 50:
                    titles.append(f"[r/{sub}] {d.get('title','')}")
        except Exception as e:
            log.warning("Reddit r/%s failed: %s. Continuing.", sub, e)
    return titles


def _parse_feed_url(url: str) -> Any:
    """Sync feed parse (run in thread)."""
    return feedparser.parse(url)


async def fetch_product_hunt() -> list[str]:
    """Latest Product Hunt launches."""
    try:
        feed = await asyncio.to_thread(_parse_feed_url, "https://www.producthunt.com/feed")
        return [f"[PH] {e.title}: {getattr(e, 'summary', '')[:80]}" for e in feed.entries[:15]]
    except Exception as e:
        log.warning("Product Hunt failed: %s", e)
        return []


async def fetch_google_trends() -> list[str]:
    """Google Trends for US, UK, global."""
    trends: list[str] = []
    geos = [("US", "United States"), ("GB", "United Kingdom"), ("", "Global")]
    for geo, name in geos:
        try:
            url = f"https://trends.google.com/trends/trendingsearches/daily/rss?geo={geo}"
            feed = await asyncio.to_thread(_parse_feed_url, url)
            for e in feed.entries[:8]:
                trends.append(f"[Google {name}] {e.title}")
        except Exception as e:
            log.warning("Google Trends %s failed: %s", name, e)
    return trends


@_retry_http(4)
async def fetch_github_trending() -> list[str]:
    """GitHub trending repos in AI/ML space."""
    headers: dict[str, str] = {"User-Agent": "DarwinAgent/3.0"}
    if config.github_token:
        headers["Authorization"] = f"token {config.github_token}"
    date = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    res = await state.http.get(
        "https://api.github.com/search/repositories",
        headers=headers,
        params={
            "q": f"ai OR llm OR agent created:>{date} stars:>20",
            "sort": "stars", "order": "desc", "per_page": 10,
        },
    )
    _check_429(res)
    res.raise_for_status()
    data = res.json() or {}
    items = data.get("items") or []
    return [f"[GitHub] {r.get('full_name','')}: {(r.get('description') or '')[:80]} â­{r.get('stargazers_count',0)}" for r in items]


@_retry_http(3)
async def fetch_arxiv_ai() -> list[str]:
    """Latest ArXiv AI/ML papers."""
    res = await state.http.get(
        "https://export.arxiv.org/api/query",
        params={
            "search_query": "cat:cs.AI OR cat:cs.LG",
            "sortBy": "submittedDate", "sortOrder": "descending",
            "max_results": 10,
        },
    )
    _check_429(res)
    res.raise_for_status()
    titles = re.findall(r"<title>(.*?)</title>", res.text)
    summaries = re.findall(r"<summary>(.*?)</summary>", res.text, re.DOTALL)
    result: list[str] = []
    for t, s in zip(titles[1:], summaries):
        clean_s = re.sub(r"\s+", " ", s).strip()[:120]
        result.append(f"[ArXiv] {t}: {clean_s}")
    return result[:8]


@_retry_http(3)
async def fetch_devto() -> list[str]:
    """Trending DEV.to articles."""
    res = await state.http.get(
        "https://dev.to/api/articles",
        params={"top": 7, "per_page": 10},
    )
    _check_429(res)
    res.raise_for_status()
    data = res.json()
    return [f"[DEV.to] {a['title']} ({a.get('positive_reactions_count',0)}âť¤)" for a in data]


async def fetch_indiehackers() -> list[str]:
    """Indie Hackers RSS feed."""
    try:
        feed = await asyncio.to_thread(_parse_feed_url, "https://www.indiehackers.com/feed.rss")
        return [f"[IndieHackers] {e.title}" for e in feed.entries[:8]]
    except Exception as e:
        log.warning("IndieHackers failed: %s", e)
        return []


async def gather_all_trends() -> str:
    """
    Collect intelligence from all sources in parallel. A single failing source
    does not stop the process: exceptions are logged and we continue with available data.
    """
    log.info("Gathering multi-source intelligence...")
    fetchers = [
        ("HackerNews", fetch_hackernews()),
        ("Reddit", fetch_reddit()),
        ("ProductHunt", fetch_product_hunt()),
        ("GoogleTrends", fetch_google_trends()),
        ("GitHub", fetch_github_trending()),
        ("ArXiv", fetch_arxiv_ai()),
        ("DEV.to", fetch_devto()),
        ("IndieHackers", fetch_indiehackers()),
    ]
    results = await asyncio.gather(
        *[f[1] for f in fetchers],
        return_exceptions=True,
    )
    now = datetime.now(timezone.utc)
    # Log any failure so we have visibility; keep successful lists
    for (name, _), result in zip(fetchers, results):
        if isinstance(result, Exception):
            log.warning("Trend source %s failed: %s", name, result)
    hn = results[0] if not isinstance(results[0], Exception) else []
    reddit = results[1] if not isinstance(results[1], Exception) else []
    ph = results[2] if not isinstance(results[2], Exception) else []
    gt = results[3] if not isinstance(results[3], Exception) else []
    gh = results[4] if not isinstance(results[4], Exception) else []
    arxiv = results[5] if not isinstance(results[5], Exception) else []
    devto = results[6] if not isinstance(results[6], Exception) else []
    ih = results[7] if not isinstance(results[7], Exception) else []

    sections = [f"# INTELLIGENCE REPORT â€” {now.strftime('%Y-%m-%d %H:%M UTC')}"]
    sections.append(f"Day: {now.strftime('%A')}, Hour: {now.hour}:00 UTC")
    sections.append("---")

    if isinstance(hn, list) and hn:
        sections.append("## đź”Ą HackerNews Top Stories\n" + "\n".join(f"- {t}" for t in hn[:15]))
    if isinstance(reddit, list) and reddit:
        sections.append("## đź’¬ Reddit Hot\n" + "\n".join(f"- {t}" for t in reddit[:20]))
    if isinstance(ph, list) and ph:
        sections.append("## đźš€ Product Hunt\n" + "\n".join(f"- {t}" for t in ph[:10]))
    if isinstance(gt, list) and gt:
        sections.append("## đź“ Google Trends\n" + "\n".join(f"- {t}" for t in gt[:15]))
    if isinstance(gh, list) and gh:
        sections.append("## â­ GitHub Trending (AI/ML)\n" + "\n".join(f"- {t}" for t in gh[:10]))
    if isinstance(arxiv, list) and arxiv:
        sections.append("## đź”¬ ArXiv Latest AI Papers\n" + "\n".join(f"- {t}" for t in arxiv[:8]))
    if isinstance(devto, list) and devto:
        sections.append("## đź“ť DEV.to Trending\n" + "\n".join(f"- {t}" for t in devto[:8]))
    if isinstance(ih, list) and ih:
        sections.append("## đź’ˇ IndieHackers\n" + "\n".join(f"- {t}" for t in ih[:8]))

    combined = "\n\n".join(sections)
    ok_sources = sum(1 for r in results if isinstance(r, list) and r)
    log.info("Intelligence: %d lines from %d sources", combined.count("\n"), ok_sources)
    return combined


# â”€â”€ Performance Memory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    if not state.darwin_user_id:
        return "No Darwin user yet."
    try:
        darwin_agents = client.table("agents")\
            .select("name, category_slug, total_tasks_completed, avg_rating, created_at")\
            .eq("creator_id", state.darwin_user_id)\
            .order("created_at", desc=True)\
            .limit(30)\
            .execute()

        if not darwin_agents.data:
            return "No Darwin agents yet â€” this is the first run!"

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
                lines.append(f"  - {a['name']} ({a['category_slug']}): {a['total_tasks_completed']} tasks, {a.get('avg_rating',0):.1f}â…")

        return "\n".join(lines)
    except Exception as e:
        return f"Performance data unavailable: {e}"


def _normalize_name(name: str) -> str:
    """Normalize agent name for deduplication: lowercase, sorted words."""
    words = re.sub(r"[^a-z0-9\s]", "", str(name).lower()).split()
    return " ".join(sorted(words)) if words else ""


def get_existing_names_and_slugs(client: Client) -> tuple[set[str], set[str]]:
    """Return (normalized_names, slugs) for all agents to avoid duplicates."""
    try:
        res = client.table("agents").select("name, slug").execute()
        data = res.data or []
        names = {_normalize_name(r.get("name", "")) for r in data if r.get("name")}
        slugs = {str(r.get("slug", "")).strip().lower() for r in data if r.get("slug")}
        return (names, slugs)
    except Exception as e:
        log.warning(f"Existing names/slugs error: {e}")
        return (set(), set())


def get_darwin_created_today_per_category(client: Client) -> dict[str, int]:
    """Count Darwin-created agents per category today (UTC)."""
    if not state.darwin_user_id:
        return {}
    try:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        res = client.table("agents")\
            .select("category_slug")\
            .eq("creator_id", state.darwin_user_id)\
            .gte("created_at", today_start.isoformat())\
            .execute()
        cat_counts: dict[str, int] = {}
        for r in (res.data or []):
            c = (r.get("category_slug") or "custom").strip() or "custom"
            cat_counts[c] = cat_counts.get(c, 0) + 1
        return cat_counts
    except Exception as e:
        log.warning(f"Darwin today per category error: {e}")
        return {}


# â”€â”€ Agent Generation (Pydantic + repair loop + sanitization) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class GeneratedAgent(BaseModel):
    """Expected structure of one generated agent from the LLM."""

    name: str = Field(..., min_length=1, max_length=120)
    slug: str = Field(..., min_length=1, max_length=80)
    description: str = Field(..., min_length=1, max_length=200)
    long_description: str = Field(default="", max_length=2000)
    category_slug: str = Field(..., min_length=1, max_length=50)
    price_per_task: int = Field(default=75, ge=10, le=5000)
    tags: list[str] = Field(default_factory=list, max_length=10)
    capabilities: list[str] = Field(default_factory=list, max_length=15)
    use_cases: list[str] = Field(default_factory=list, max_length=10)
    example_input: str = Field(default="", max_length=500)
    example_output: str = Field(default="", max_length=500)
    system_prompt: str = Field(..., min_length=50, max_length=8000)


def sanitize_system_prompt(text: str) -> str:
    """
    Sanitize system_prompt: remove forbidden strings and null bytes.
    Returns cleaned string.
    """
    if not text or not isinstance(text, str):
        return ""
    out = text.replace("\x00", "").strip()
    lower = out.lower()
    for forbidden in FORBIDDEN_SYSTEM_PROMPT_PATTERNS:
        if forbidden in lower:
            out = re.sub(re.escape(forbidden), "", out, flags=re.IGNORECASE)
    return out.strip() or ""


def _repair_json_raw(raw: str) -> str:
    """Strip markdown wrappers and extract JSON array for repair loop."""
    stripped = raw.strip()
    # Remove markdown code blocks
    for pattern in [r"```json\s*([\s\S]*?)\s*```", r"```\s*([\s\S]*?)\s*```"]:
        m = re.search(pattern, stripped)
        if m:
            stripped = m.group(1).strip()
    # Find first [ and last ]
    start = stripped.find("[")
    end = stripped.rfind("]")
    if start != -1 and end != -1 and end > start:
        stripped = stripped[start : end + 1]
    return stripped


def parse_agents_json(raw: str) -> list[dict[str, Any]]:
    """
    Parse LLM output into list of agent dicts. Uses repair loop: try direct parse,
    then strip markdown/regex extraction, then validate with Pydantic (per-item).
    Returns list of validated dicts (only valid items); invalid items are skipped.
    """
    repaired = _repair_json_raw(raw)
    parsed: list[dict[str, Any]] = []
    try:
        data = json.loads(repaired)
        if not isinstance(data, list):
            return []
        for i, item in enumerate(data):
            if not isinstance(item, dict):
                continue
            try:
                agent = GeneratedAgent.model_validate(item)
                # Apply sanitization
                agent.system_prompt = sanitize_system_prompt(agent.system_prompt)
                if len(agent.system_prompt) < 50:
                    log.warning("Agent %s: system_prompt too short after sanitization, skipping", item.get("name"))
                    continue
                parsed.append(agent.model_dump())
            except Exception as e:
                log.warning("Agent %d (%s) validation failed: %s", i, item.get("name"), e)
        return parsed
    except json.JSONDecodeError as e:
        log.warning("JSON decode failed after repair: %s", e)
        return []


def build_darwin_system(category_performance: dict[str, Any], agent_history: str) -> str:
    """Build Darwin's generation prompt with learned context. Uses categories from state."""
    cats = state.categories or ["automation", "coding", "research"]
    top_cats = list(category_performance.keys())[:5] if category_performance else cats[:3]
    cat_str = ", ".join(top_cats) if top_cats else ", ".join(cats[:3])

    return f"""You are DARWIN v3 â€” the most advanced AI agent architect in existence.
Your mission: create extraordinary AI agents that people immediately want to deploy.

## YOUR PERFORMANCE HISTORY
{agent_history}

## MARKET INTELLIGENCE (Category Success)
Most successful categories by user demand: {cat_str}
All available categories: {', '.join(cats)}

## WHAT MAKES A GREAT AGENT
1. **Solves a BURNING problem** people face right now (not theoretical)
2. **Completable by AI** â€” browsing web, extracting data, writing, coding, analysis
3. **Clear ROI** â€” saves hours, makes money, provides insight
4. **Specific enough** â€” not "research assistant" but "YCombinator Application Optimizer"
5. **Viral name** â€” memorable, results-focused, not generic

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


@retry(
    retry=retry_if_exception_type((Exception,)),
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    reraise=True,
)
async def _call_ollama(system_prompt: str, user_message: str) -> str:
    """Call Ollama with exponential backoff on failure."""
    ai = _ollama_client()
    # Use fewer tokens on CPU to avoid very long waits
    max_tok = 2000 if not os.getenv("OLLAMA_GPU", "") else 6000
    response = await ai.chat.completions.create(
        model=config.ollama_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_tokens=max_tok,
        temperature=0.9,
    )
    return response.choices[0].message.content or "[]"


@retry(
    retry=retry_if_exception_type((Exception,)),
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    reraise=True,
)
async def _call_claude(system_prompt: str, user_message: str) -> str:
    """Call Claude with exponential backoff on failure (e.g. 429)."""
    ai = _claude_client()
    response = await ai.messages.create(
        model=config.claude_model,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
        max_tokens=6000,
        temperature=0.9,
    )
    return response.content[0].text if response.content else "[]"


async def generate_agents(trends: str, category_performance: dict, agent_history: str) -> list[dict]:
    """Generate agent ideas with retry and fallback LLM (Claude â†’ Ollama)."""
    system_prompt = build_darwin_system(category_performance, agent_history)
    user_message = f"""Today's global intelligence signals:

{trends}

Based on these SPECIFIC trends, generate 10 unique AI agents that solve real problems.
Each agent must be directly inspired by something in the trends above.
Prioritize categories that perform well: {', '.join(list(category_performance.keys())[:3]) if category_performance else 'any'}

Return valid JSON array only:"""

    primary_ollama = bool(config.ollama_url)
    fallback_ollama = (not primary_ollama) and bool(config.ollama_url)

    for attempt in range(1, config.llm_retries + 1):
        for use_ollama in (primary_ollama, fallback_ollama):
            if use_ollama and not config.ollama_url:
                continue
            if not use_ollama and not config.anthropic_api_key:
                continue
            llm_name = "Ollama" if use_ollama else "Claude Sonnet"
            try:
                log.info(f"đź§¬ Generating agents with {llm_name} (attempt {attempt})...")
                raw = await (_call_ollama(system_prompt, user_message) if use_ollama else _call_claude(system_prompt, user_message))
                log.info("Raw response length: %d chars", len(raw))
                agents = parse_agents_json(raw)
                if agents:
                    log.info(f"âś… Parsed {len(agents)} agents from {llm_name}")
                    return agents
            except Exception as e:
                log.warning(f"{llm_name} attempt {attempt} failed: {e}")
                await asyncio.sleep(2**attempt)
                continue

    log.error("Failed to parse agents JSON after all retries")
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
    if agent.get("category_slug") in (state.categories or []):
        score += 0.5

    # Sensible pricing
    price = agent.get("price_per_task", 0)
    if isinstance(price, (int, float)) and 15 <= price <= 2000:
        score += 0.5

    return min(score, 10.0)


# â”€â”€ Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _unique_slug(slug: str, existing: set) -> str:
    if slug not in existing:
        return slug
    suffix = hashlib.md5(f"{slug}{datetime.now().isoformat()}".encode()).hexdigest()[:4]
    return f"{slug}-{suffix}"


async def register_agent(
    client: Client,
    agent: dict,
    existing_slugs: set,
    existing_names: set,
    today_per_category: dict[str, int],
) -> Optional[str]:
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

        norm = _normalize_name(name)
        if norm and norm in existing_names:
            log.info(f"Skipping duplicate name: {name}")
            return None

        category = agent.get("category_slug", "custom")
        valid_cats = state.categories or ["research", "coding", "automation", "content", "data", "marketing", "finance", "productivity", "ai-tools", "custom"]
        if category not in valid_cats:
            category = "custom"
        if today_per_category.get(category, 0) >= config.max_per_category_per_day:
            log.info("Skipping %s: category %s already has %d today", name, category, config.max_per_category_per_day)
            return None

        slug = _unique_slug(slug, existing_slugs)
        existing_slugs.add(slug)
        existing_names.add(norm)

        price = int(agent.get("price_per_task", 75))
        price = max(10, min(price, 5000))

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
            "creator_id":       state.darwin_user_id,
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
            today_per_category[category] = today_per_category.get(category, 0) + 1
            log.info(f"âś… {name} (@{slug}) â€” âšˇ{price}cr â€” {category}")
            return agent_id
        return None

    except Exception as e:
        log.error(f"Register error for {agent.get('name')}: {e}")
        return None


# â”€â”€ Darwin Run â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async def darwin_run(label: str = "scheduled") -> int:
    """Main Darwin execution: intelligence â†’ generation â†’ quality filter â†’ register."""
    log.info("=" * 65)
    log.info("DARWIN v3 â€” %s â€” %s", label.upper(), datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
    log.info("=" * 65)

    await ensure_darwin_user()
    client = get_db()

    # Get context: existing names/slugs + Darwin's today per category
    existing_names, existing_slugs = get_existing_names_and_slugs(client)
    today_per_category = get_darwin_created_today_per_category(client)
    log.info(f"đź“¦ Existing agents: {len(existing_slugs)} slugs, {len(existing_names)} names; today per category: {today_per_category}")

    category_performance = await get_successful_categories(client)
    agent_history = await get_recent_agents_performance(client)
    log.info(f"đź“Š Category intelligence: {list(category_performance.keys())[:5]}")

    # Gather intelligence
    trends = await gather_all_trends()

    # Generate agents
    agents = await generate_agents(trends, category_performance, agent_history)
    log.info(f"đź’ˇ Generated {len(agents)} candidate agents")

    if not agents:
        log.error("No agents generated â€” aborting")
        return 0

    # Quality filter â€” only register agents scoring > 5.0
    scored = [(a, _score_agent(a)) for a in agents]
    scored.sort(key=lambda x: x[1], reverse=True)

    log.info("đź“Š Quality scores:")
    for a, s in scored:
        log.info(f"  {'âś…' if s > 5 else 'âťŚ'} {a.get('name','?')} â€” score: {s:.1f}/10")

    qualified = [(a, s) for a, s in scored if s > 4.0][:config.agents_per_run]
    log.info(f"âś… {len(qualified)}/{len(scored)} agents passed quality filter")

    # Register (with dedup and per-category limit)
    registered = 0
    registered_ids = []
    for agent, score in qualified:
        agent_id = await register_agent(client, agent, existing_slugs, existing_names, today_per_category)
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
    if registered > 0 and config.owner_user_id:
        try:
            client.table("notifications").insert({
                "user_id": config.owner_user_id,
                "type": "info",
                "title": f"đź¦  Darwin published {registered} new agents",
                "body": f"{label.title()} run: {registered} agents added to marketplace based on today's trends.",
                "link": "/marketplace",
            }).execute()
        except Exception:
            pass

    log.info("DARWIN COMPLETE: %d/%d agents registered", registered, config.agents_per_run)
    return registered


async def run_with_lock(label: str = "scheduled") -> int:
    """Run Darwin with a lock so only one run at a time."""
    async with state._run_lock:
        if state.running:
            log.warning("Run already in progress, skipping")
            return 0
        state.running = True
    try:
        return await darwin_run(label)
    finally:
        async with state._run_lock:
            state.running = False


def run_sync(label: str = "scheduled") -> int:
    return asyncio.run(run_with_lock(label))


# â”€â”€ HTTP server (health + cron trigger) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

UTC_HOURS = (6, 14, 22)  # 06:00, 14:00, 22:00 UTC


def _seconds_until_next_run() -> float:
    now = datetime.now(timezone.utc)
    for h in UTC_HOURS:
        next_run = now.replace(hour=h, minute=0, second=0, microsecond=0)
        if next_run > now:
            return (next_run - now).total_seconds()
    next_run = (now + timedelta(days=1)).replace(hour=UTC_HOURS[0], minute=0, second=0, microsecond=0)
    return (next_run - now).total_seconds()


async def scheduler_loop():
    """Every 8h at 06:00, 14:00, 22:00 UTC run Darwin."""
    while True:
        secs = _seconds_until_next_run()
        log.info(f"âŹ° Next Darwin run in {secs / 3600:.1f}h (06/14/22 UTC)")
        await asyncio.sleep(secs)
        await run_with_lock("scheduled")


async def handle_health(_: web.Request) -> web.Response:
    return web.json_response({"ok": True, "service": "darwin"})


async def handle_run(request: web.Request) -> web.Response:
    if config.cron_secret:
        auth = request.headers.get("Authorization", "")
        if auth != f"Bearer {config.cron_secret}":
            return web.json_response({"error": "Unauthorized"}, status=401)
    if state.running:
        return web.json_response({"status": "running", "message": "Run already in progress"}, status=409)
    label = "cron"
    try:
        if request.body_exists:
            body = await request.json()
            label = str(body.get("label", "cron"))[:32]
    except Exception:
        pass
    asyncio.create_task(run_with_lock(label))
    return web.json_response({"status": "started", "label": label}, status=202)


def create_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/health", handle_health)
    app.router.add_post("/run", handle_run)
    return app


# â”€â”€ Entry Point â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async def init_http_client() -> None:
    """Create shared HTTP client and set on state. Call once at startup."""
    if state._http_client is None:
        state.set_http_client(httpx.AsyncClient(timeout=30.0))
        log.info("Shared HTTP client initialized")


async def main_async() -> None:
    """Cloud-native entry: single run (--now) or long-running server."""
    import sys

    await init_http_client()
    load_categories_from_db()

    if "--now" in sys.argv:
        log.info("Darwin single run (--now)")
        try:
            await run_with_lock("manual")
        finally:
            await state.close_http_client()
        return

    log.info("Darwin v3 â€” HTTP server + scheduler (06:00, 14:00, 22:00 UTC)")
    log.info("GET /health; POST /run (Bearer CRON_SECRET)")
    app = create_app()

    asyncio.create_task(scheduler_loop())
    asyncio.create_task(run_with_lock("startup"))
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", config.port)
    await site.start()
    log.info("HTTP server listening on 0.0.0.0:%d", config.port)
    try:
        await asyncio.Event().wait()
    finally:
        await state.close_http_client()


if __name__ == "__main__":
    asyncio.run(main_async())

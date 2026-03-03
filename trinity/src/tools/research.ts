/**
 * RESEARCH TOOLS — Web intelligence for autonomous agents
 * Agents can browse the web, analyze competitors, find trends,
 * read documentation, and gather market intelligence.
 */

import axios from "axios";
import { GrokTool } from "../core/grok";

// ── Tool definitions ───────────────────────────────────────────────────────────

export const RESEARCH_TOOLS: GrokTool[] = [
  {
    name: "fetch_webpage",
    description: "Завантажує та читає вміст будь-якої веб-сторінки. Корисно для дослідження, читання документації, аналізу конкурентів.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL сторінки для читання" },
        extract_text_only: { type: "boolean", description: "Витягнути тільки текст (без HTML тегів)" },
      },
      required: ["url"],
    },
  },
  {
    name: "search_hackernews",
    description: "Шукає на HackerNews за темою. Показує trending обговорення та нові технології.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        days: { type: "number", description: "За скільки днів шукати (default: 7)" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_github_trending",
    description: "Отримує трендові репозиторії GitHub за мовою та темою",
    parameters: {
      type: "object",
      properties: {
        language: { type: "string", description: "Python, TypeScript, JavaScript тощо" },
        since: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Часовий діапазон" },
      },
      required: [],
    },
  },
  {
    name: "analyze_competitor",
    description: "Аналізує сайт конкурента: структура, функції, ціни, позиціонування",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL конкурента" },
        focus: { type: "string", description: "На що звернути увагу: pricing, features, ux, copy" },
      },
      required: ["url"],
    },
  },
  {
    name: "get_ai_news",
    description: "Отримує останні новини про AI/ML технології (ProductHunt, Reddit, TechCrunch)",
    parameters: {
      type: "object",
      properties: {
        source: { type: "string", enum: ["producthunt", "reddit_ai", "all"], description: "Джерело новин" },
        limit: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "check_npm_package",
    description: "Перевіряє інформацію про npm пакет: версія, завантаження, оновлення",
    parameters: {
      type: "object",
      properties: { package_name: { type: "string" } },
      required: ["package_name"],
    },
  },
  {
    name: "get_supabase_docs",
    description: "Читає документацію Supabase за темою (RLS, Functions, Realtime тощо)",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Тема: rls, functions, realtime, storage, edge-functions тощо" },
      },
      required: ["topic"],
    },
  },
  {
    name: "get_nextjs_docs",
    description: "Читає документацію Next.js за темою (app router, server actions, API routes тощо)",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Тема для пошуку" },
      },
      required: ["topic"],
    },
  },
  {
    name: "search_stackoverflow",
    description: "Шукає рішення технічних проблем на StackOverflow",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        tags: { type: "string", description: "Теги через кому: nextjs,typescript,supabase" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_platform_seo_score",
    description: "Аналізує SEO метрики основного домену платформи",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL для аналізу (default: головна сторінка)" },
      },
      required: [],
    },
  },
];

// ── Executors ──────────────────────────────────────────────────────────────────

export async function executeResearchTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "fetch_webpage": {
      try {
        const res = await axios.get(args.url as string, {
          timeout: 15000,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; TrinityBot/1.0; +https://genesis-node.app)",
          },
        });
        let content = res.data as string;
        if (typeof content !== "string") content = JSON.stringify(content);

        if (args.extract_text_only !== false) {
          // Strip HTML tags
          content = content
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        }

        return `URL: ${args.url}\n\n${content.slice(0, 6000)}`;
      } catch (err: any) {
        return `Fetch error for ${args.url}: ${err.message}`;
      }
    }

    case "search_hackernews": {
      try {
        const dateFrom = Math.floor(Date.now() / 1000) - ((args.days as number ?? 7) * 86400);
        const res = await axios.get("https://hn.algolia.com/api/v1/search", {
          params: {
            query: args.query,
            numericFilters: `created_at_i>${dateFrom}`,
            hitsPerPage: args.limit ?? 10,
            tags: "story",
          },
        });
        return res.data.hits.map((h: any) =>
          `[${h.points}pts] ${h.title} — ${h.url ?? "hn.algolia.com"} (${h.num_comments} comments)`
        ).join("\n");
      } catch (err: any) {
        return `HN search error: ${err.message}`;
      }
    }

    case "get_github_trending": {
      try {
        const lang = args.language ? `language:${args.language}` : "";
        const since = args.since ?? "weekly";
        const dateMap: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };
        const days = dateMap[since as string] ?? 7;
        const date = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

        const res = await axios.get("https://api.github.com/search/repositories", {
          params: {
            q: `${lang} created:>${date} stars:>10`.trim(),
            sort: "stars",
            order: "desc",
            per_page: 10,
          },
          headers: {
            "User-Agent": "TrinityBot/1.0",
            ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
          },
        });

        return res.data.items.map((r: any) =>
          `⭐${r.stargazers_count} ${r.full_name} — ${r.description?.slice(0, 100) ?? "no description"}`
        ).join("\n");
      } catch (err: any) {
        return `GitHub trending error: ${err.message}`;
      }
    }

    case "analyze_competitor": {
      try {
        const res = await axios.get(args.url as string, {
          timeout: 15000,
          headers: { "User-Agent": "Mozilla/5.0 TrinityResearchBot" },
        });
        const html = res.data as string;
        const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);

        // Extract pricing mentions
        const pricingMatches = text.match(/\$[\d,]+|free|pro|enterprise|starter|pricing/gi) ?? [];

        return `COMPETITOR ANALYSIS: ${args.url}\nFocus: ${args.focus ?? "general"}\n\nCONTENT:\n${text.slice(0, 3000)}\n\nPRICING MENTIONS: ${[...new Set(pricingMatches)].join(", ")}`;
      } catch (err: any) {
        return `Competitor analysis failed for ${args.url}: ${err.message}`;
      }
    }

    case "get_ai_news": {
      const source = args.source ?? "all";
      const results: string[] = [];

      if (source === "producthunt" || source === "all") {
        try {
          const feed = await axios.get("https://www.producthunt.com/feed", { timeout: 10000 });
          const titles = (feed.data as string).match(/<title>(.*?)<\/title>/g)?.slice(1, 8) ?? [];
          results.push("## Product Hunt:\n" + titles.map((t: string) => t.replace(/<\/?title>/g, "")).join("\n"));
        } catch { results.push("Product Hunt: unavailable"); }
      }

      if (source === "reddit_ai" || source === "all") {
        try {
          const res = await axios.get("https://www.reddit.com/r/artificial/hot.json?limit=5", {
            headers: { "User-Agent": "TrinityBot/1.0" },
          });
          const posts = res.data.data.children.map((c: any) => `• ${c.data.title}`);
          results.push("## Reddit r/artificial:\n" + posts.join("\n"));
        } catch { results.push("Reddit: unavailable"); }
      }

      return results.join("\n\n") || "No AI news available";
    }

    case "check_npm_package": {
      try {
        const res = await axios.get(`https://registry.npmjs.org/${args.package_name}`);
        const latest = res.data["dist-tags"].latest;
        const info = res.data.versions[latest];
        const downloads = await axios.get(`https://api.npmjs.org/downloads/point/last-week/${args.package_name}`);
        return `Package: ${args.package_name}\nLatest: ${latest}\nDownloads/week: ${downloads.data.downloads?.toLocaleString() ?? "unknown"}\nDeps: ${Object.keys(info.dependencies ?? {}).join(", ")}`;
      } catch (err: any) {
        return `NPM error: ${err.message}`;
      }
    }

    case "get_supabase_docs": {
      try {
        const url = `https://supabase.com/docs/${args.topic}`;
        const res = await axios.get(url, { timeout: 10000 });
        const text = (res.data as string).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return `Supabase docs [${args.topic}]:\n${text.slice(0, 4000)}`;
      } catch (err: any) {
        return `Supabase docs error: ${err.message}`;
      }
    }

    case "get_nextjs_docs": {
      try {
        const res = await axios.get(`https://nextjs.org/docs/app/${args.topic}`, { timeout: 10000 });
        const text = (res.data as string).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return `Next.js docs [${args.topic}]:\n${text.slice(0, 4000)}`;
      } catch (err: any) {
        return `Next.js docs error: ${err.message}. Try searching: https://nextjs.org/docs/app`;
      }
    }

    case "search_stackoverflow": {
      try {
        const res = await axios.get("https://api.stackexchange.com/2.3/search/advanced", {
          params: {
            q: args.query,
            tagged: args.tags,
            order: "desc", sort: "votes",
            site: "stackoverflow",
            pagesize: 5,
            filter: "withbody",
          },
        });
        return res.data.items.slice(0, 5).map((q: any) =>
          `[${q.score}] ${q.title}\n${q.body?.replace(/<[^>]+>/g, "").trim().slice(0, 300) ?? "no body"}\nhttps://stackoverflow.com/q/${q.question_id}`
        ).join("\n\n---\n\n");
      } catch (err: any) {
        return `StackOverflow error: ${err.message}`;
      }
    }

    case "get_platform_seo_score": {
      const url = (args.url as string) ?? (process.env.GENESIS_API_URL ?? "https://agents-dev-roan.vercel.app");
      try {
        const res = await axios.get(url, { timeout: 10000 });
        const html = res.data as string;

        const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] ?? "missing";
        const description = html.match(/name="description" content="([^"]+)"/i)?.[1] ?? "missing";
        const h1s = (html.match(/<h1[^>]*>.*?<\/h1>/gi) ?? []).length;
        const ogTitle = html.match(/property="og:title" content="([^"]+)"/i)?.[1] ?? "missing";
        const hasCanonical = html.includes('rel="canonical"');
        const hasSchema = html.includes('application/ld+json');

        let score = 0;
        if (title !== "missing" && title.length > 10) score += 20;
        if (description !== "missing" && description.length > 50) score += 20;
        if (h1s === 1) score += 20;
        if (ogTitle !== "missing") score += 20;
        if (hasCanonical) score += 10;
        if (hasSchema) score += 10;

        return `SEO Score: ${score}/100\nTitle: ${title}\nDescription: ${description}\nH1 count: ${h1s}\nOG Title: ${ogTitle}\nCanonical: ${hasCanonical}\nSchema.org: ${hasSchema}`;
      } catch (err: any) {
        return `SEO check failed: ${err.message}`;
      }
    }

    default:
      return `Unknown research tool: ${name}`;
  }
}

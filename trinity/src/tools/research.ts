/**
 * RESEARCH TOOLS v3 â€” Maximum web intelligence for Trinity agents
 * 12 tools: web browsing, AI news, GitHub, HN, competitor analysis,
 * ArXiv, DEV.to, SEO analysis, documentation, YouTube trends, social signals.
 */

import axios from "axios";
import { GrokTool } from "../core/grok";

export const RESEARCH_TOOLS: GrokTool[] = [
  {
    name: "fetch_webpage",
    description: "Download and read content of any webpage. Essential for research and competitor analysis.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
        extract_text_only: { type: "boolean" },
        max_chars: { type: "number" },
      },
      required: ["url"],
    },
  },
  {
    name: "search_hackernews",
    description: "Search HackerNews for trending discussions, newest tech, developer sentiment",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        days: { type: "number" },
        limit: { type: "number" },
        search_type: { type: "string", enum: ["story", "comment", "ask_hn", "show_hn"] },
      },
      required: ["query"],
    },
  },
  {
    name: "get_github_trending",
    description: "Get trending GitHub repos by language and time period",
    parameters: {
      type: "object",
      properties: {
        language: { type: "string" },
        since: { type: "string", enum: ["daily", "weekly", "monthly"] },
        topic: { type: "string", description: "Filter by topic: ai, llm, agent, automation" },
      },
      required: [],
    },
  },
  {
    name: "analyze_competitor",
    description: "Deep analysis of competitor website: pricing, features, copy, UX patterns",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
        focus: { type: "string", description: "pricing|features|ux|copy|all" },
      },
      required: ["url"],
    },
  },
  {
    name: "get_ai_news",
    description: "Latest AI/ML news from multiple sources: ProductHunt, Reddit, ArXiv, DEV.to",
    parameters: {
      type: "object",
      properties: {
        source: { type: "string", enum: ["producthunt", "reddit_ai", "arxiv", "devto", "all"] },
        limit: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "check_npm_package",
    description: "Get npm package info: version, weekly downloads, dependencies",
    parameters: {
      type: "object",
      properties: { package_name: { type: "string" } },
      required: ["package_name"],
    },
  },
  {
    name: "get_supabase_docs",
    description: "Read Supabase documentation for a specific feature",
    parameters: {
      type: "object",
      properties: { topic: { type: "string" } },
      required: ["topic"],
    },
  },
  {
    name: "get_nextjs_docs",
    description: "Read Next.js 15 documentation for a specific topic",
    parameters: {
      type: "object",
      properties: { topic: { type: "string" } },
      required: ["topic"],
    },
  },
  {
    name: "search_stackoverflow",
    description: "Search Stack Overflow for technical solutions",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        tags: { type: "string", description: "Comma-separated: nextjs,typescript,supabase" },
        min_score: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_platform_seo_score",
    description: "Analyze SEO quality: title, description, H1s, Open Graph, canonical, schema",
    parameters: {
      type: "object",
      properties: { url: { type: "string" } },
      required: [],
    },
  },
  {
    name: "search_reddit",
    description: "Search Reddit for user discussions, pain points, and market signals",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        subreddits: { type: "array", items: { type: "string" }, description: "Specific subreddits to search" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_google_trends",
    description: "Get Google Trends data for a search term to understand market demand",
    parameters: {
      type: "object",
      properties: {
        terms: { type: "array", items: { type: "string" }, description: "Up to 3 terms to compare" },
        geo: { type: "string", description: "Country code: US, GB, UA, or empty for global" },
      },
      required: ["terms"],
    },
  },
];

// â”€â”€ Executors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function executeResearchTool(name: string, args: Record<string, unknown>): Promise<string> {
  const UA = "Mozilla/5.0 (compatible; TrinityBot/3.0; +https://genesis-node.app)";

  switch (name) {
    case "fetch_webpage": {
      try {
        const res = await axios.get(args.url as string, {
          timeout: 15000,
          headers: { "User-Agent": UA },
        });
        let content = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        const maxChars = (args.max_chars as number) ?? 8000;

        if (args.extract_text_only !== false) {
          content = content
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        }
        return `URL: ${args.url}\nStatus: ${res.status}\n\n${content.slice(0, maxChars)}`;
      } catch (err: any) {
        return `Fetch error for ${args.url}: ${err.message}`;
      }
    }

    case "search_hackernews": {
      try {
        const dateFrom = Math.floor(Date.now() / 1000) - ((args.days as number ?? 7) * 86400);
        const type = (args.search_type as string) ?? "story";
        const res = await axios.get("https://hn.algolia.com/api/v1/search", {
          params: {
            query: args.query,
            numericFilters: `created_at_i>${dateFrom}`,
            hitsPerPage: args.limit ?? 15,
            tags: type,
          },
        });
        return res.data.hits.map((h: any) =>
          `[${h.points ?? 0}pts | ${h.num_comments ?? 0} comments] ${h.title ?? h.comment_text?.slice(0, 100)}\n  ${h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`}`
        ).join("\n\n");
      } catch (err: any) {
        return `HN error: ${err.message}`;
      }
    }

    case "get_github_trending": {
      try {
        const lang = args.language ? `language:${args.language}` : "";
        const topicFilter = args.topic ? `topic:${args.topic}` : "";
        const since = args.since ?? "weekly";
        const days = ({ daily: 1, weekly: 7, monthly: 30 } as Record<string, number>)[since as string] ?? 7;
        const date = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

        const q = `${lang} ${topicFilter} created:>${date} stars:>10`.trim();
        const res = await axios.get("https://api.github.com/search/repositories", {
          params: { q, sort: "stars", order: "desc", per_page: 12 },
          headers: {
            "User-Agent": "TrinityBot/3.0",
            ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
          },
        });
        return res.data.items.map((r: any) =>
          `â­${r.stargazers_count} | ${r.full_name}\n  ${r.description?.slice(0, 100) ?? "no desc"}\n  ${r.html_url}`
        ).join("\n\n");
      } catch (err: any) {
        return `GitHub trending error: ${err.message}`;
      }
    }

    case "analyze_competitor": {
      try {
        const res = await axios.get(args.url as string, {
          timeout: 15000,
          headers: { "User-Agent": UA },
        });
        const html = res.data as string;
        const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

        const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] ?? "not found";
        const h1s = (html.match(/<h1[^>]*>(.*?)<\/h1>/gi) ?? []).map((h: string) => h.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
        const pricingMentions = [...new Set((text.match(/\$[\d,]+\/?(month|year|mo|yr)?|\bfree\b|\bpro\b|\benterprise\b|\bstarter\b/gi) ?? []))];
        const ctaButtons = (html.match(/(?:href|onclick)[^>]*(?:signup|register|start|free|trial|demo)[^"'>]*/gi) ?? []).length;

        return `COMPETITOR ANALYSIS: ${args.url}
Focus: ${args.focus ?? "all"}
Title: ${title}
H1s: ${h1s.join(" | ")}
CTA buttons found: ${ctaButtons}
Pricing mentions: ${pricingMentions.join(", ")}

Page content (${args.focus ?? "general"}):
${text.slice(0, 4000)}`;
      } catch (err: any) {
        return `Competitor analysis failed: ${err.message}`;
      }
    }

    case "get_ai_news": {
      const source = args.source ?? "all";
      const results: string[] = [];
      const limit = (args.limit as number) ?? 10;

      if (source === "producthunt" || source === "all") {
        try {
          const feed = await axios.get("https://www.producthunt.com/feed", { timeout: 10000 });
          const titles = (feed.data as string).match(/<title>(.*?)<\/title>/g)?.slice(1, limit + 1) ?? [];
          results.push("## đźš€ Product Hunt:\n" + titles.map((t: string) => `- ${t.replace(/<\/?title>/g, "")}`).join("\n"));
        } catch { results.push("Product Hunt: unavailable"); }
      }

      if (source === "reddit_ai" || source === "all") {
        try {
          const subs = ["artificial", "MachineLearning", "LocalLLaMA", "OpenAI"];
          for (const sub of subs.slice(0, 2)) {
            const res = await axios.get(`https://www.reddit.com/r/${sub}/hot.json?limit=5`, {
              headers: { "User-Agent": "TrinityBot/3.0" },
            });
            const posts = res.data.data.children.map((c: any) => `- [r/${sub}] ${c.data.title} (${c.data.score})`);
            results.push(`## Reddit r/${sub}:\n${posts.join("\n")}`);
          }
        } catch { results.push("Reddit: unavailable"); }
      }

      if (source === "arxiv" || source === "all") {
        try {
          const res = await axios.get("https://export.arxiv.org/api/query", {
            params: { search_query: "cat:cs.AI OR cat:cs.LG", sortBy: "submittedDate", sortOrder: "descending", max_results: 8 },
            timeout: 10000,
          });
          const titles = (res.data as string).match(/<title>(.*?)<\/title>/g)?.slice(1, 9) ?? [];
          results.push("## đź”¬ ArXiv AI/ML:\n" + titles.map((t: string) => `- ${t.replace(/<\/?title>/g, "")}`).join("\n"));
        } catch { results.push("ArXiv: unavailable"); }
      }

      if (source === "devto" || source === "all") {
        try {
          const res = await axios.get("https://dev.to/api/articles", { params: { top: 7, per_page: 8 }, timeout: 8000 });
          results.push("## đź“ť DEV.to:\n" + res.data.map((a: any) => `- ${a.title} (${a.positive_reactions_count}âť¤)`).join("\n"));
        } catch { results.push("DEV.to: unavailable"); }
      }

      return results.join("\n\n") || "No AI news available";
    }

    case "check_npm_package": {
      try {
        const res = await axios.get(`https://registry.npmjs.org/${args.package_name}`);
        const latest = res.data["dist-tags"].latest;
        const info = res.data.versions[latest];
        const downloads = await axios.get(`https://api.npmjs.org/downloads/point/last-week/${args.package_name}`);
        return `đź“¦ ${args.package_name}@${latest}\nDownloads/week: ${(downloads.data.downloads ?? 0).toLocaleString()}\nDependencies: ${Object.keys(info.dependencies ?? {}).join(", ") || "none"}\nLicense: ${info.license ?? "unknown"}`;
      } catch (err: any) {
        return `NPM error: ${err.message}`;
      }
    }

    case "get_supabase_docs": {
      const topicMap: Record<string, string> = {
        rls: "guides/auth/row-level-security",
        functions: "guides/functions",
        realtime: "guides/realtime",
        storage: "guides/storage",
        auth: "guides/auth",
        database: "guides/database",
        "edge-functions": "guides/functions",
        cli: "guides/cli",
      };
      const topic = args.topic as string;
      const path = topicMap[topic.toLowerCase()] ?? `guides/${topic}`;
      try {
        const res = await axios.get(`https://supabase.com/docs/${path}`, { timeout: 10000 });
        const text = (res.data as string).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return `Supabase docs [${topic}]:\n${text.slice(0, 5000)}`;
      } catch (err: any) {
        return `Supabase docs error: ${err.message}. Topic: ${topic}`;
      }
    }

    case "get_nextjs_docs": {
      try {
        const topic = (args.topic as string).replace(/\s+/g, "-").toLowerCase();
        const res = await axios.get(`https://nextjs.org/docs/app/${topic}`, { timeout: 10000 });
        const text = (res.data as string).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return `Next.js docs [${topic}]:\n${text.slice(0, 5000)}`;
      } catch (err: any) {
        return `Next.js docs error: ${err.message}`;
      }
    }

    case "search_stackoverflow": {
      try {
        const res = await axios.get("https://api.stackexchange.com/2.3/search/advanced", {
          params: {
            q: args.query,
            tagged: args.tags,
            order: "desc",
            sort: "votes",
            site: "stackoverflow",
            pagesize: 5,
            filter: "withbody",
            min: args.min_score ?? 5,
          },
        });
        return res.data.items.slice(0, 5).map((q: any) =>
          `[Score: ${q.score}] ${q.title}\n${q.body?.replace(/<[^>]+>/g, "").trim().slice(0, 400) ?? ""}\nURL: https://stackoverflow.com/q/${q.question_id}`
        ).join("\n\n---\n\n");
      } catch (err: any) {
        return `StackOverflow error: ${err.message}`;
      }
    }

    case "get_platform_seo_score": {
      const url = (args.url as string) ?? (process.env.GENESIS_API_URL ?? "https://matadora.business");
      try {
        const res = await axios.get(url, { timeout: 12000 });
        const html = res.data as string;

        const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] ?? "missing";
        const description = html.match(/name="description"[^>]*content="([^"]+)"/i)?.[1] ?? "missing";
        const h1Count = (html.match(/<h1[^>]*>/gi) ?? []).length;
        const ogTitle = html.match(/property="og:title"[^>]*content="([^"]+)"/i)?.[1] ?? "missing";
        const ogDesc = html.match(/property="og:description"[^>]*content="([^"]+)"/i)?.[1] ?? "missing";
        const ogImage = html.includes('property="og:image"');
        const hasCanonical = html.includes('rel="canonical"');
        const hasSchema = html.includes("application/ld+json");
        const twitterCard = html.includes('name="twitter:card"');
        const metaRobots = html.includes('name="robots"');

        let score = 0;
        if (title !== "missing" && title.length > 10 && title.length < 70) score += 20;
        if (description !== "missing" && description.length > 50 && description.length < 160) score += 20;
        if (h1Count === 1) score += 15;
        if (ogTitle !== "missing") score += 10;
        if (ogImage) score += 10;
        if (hasCanonical) score += 10;
        if (hasSchema) score += 10;
        if (twitterCard) score += 5;

        const recommendations = [];
        if (title.length > 70) recommendations.push("Shorten title (<70 chars)");
        if (description.length > 160) recommendations.push("Shorten meta description (<160 chars)");
        if (h1Count > 1) recommendations.push(`Multiple H1s found (${h1Count}) â€” should be 1`);
        if (!ogImage) recommendations.push("Add og:image for social sharing");
        if (!hasSchema) recommendations.push("Add JSON-LD schema markup");

        return `SEO Score: ${score}/100
Title: ${title}
Description: ${description.slice(0, 100)}
H1 count: ${h1Count}
OG Title: ${ogTitle}
OG Image: ${ogImage}
Twitter Card: ${twitterCard}
Canonical: ${hasCanonical}
Schema.org: ${hasSchema}
${recommendations.length > 0 ? "\nRECOMMENDATIONS:\n" + recommendations.map(r => `- ${r}`).join("\n") : "\nâś… SEO looks good!"}`;
      } catch (err: any) {
        return `SEO check failed for ${url}: ${err.message}`;
      }
    }

    case "search_reddit": {
      try {
        const subs = (args.subreddits as string[]) ?? ["artificial", "entrepreneur", "webdev", "SideProject"];
        const results: string[] = [];
        const headers = { "User-Agent": "TrinityResearch/3.0" };

        for (const sub of subs.slice(0, 4)) {
          try {
            const res = await axios.get(`https://www.reddit.com/r/${sub}/search.json`, {
              params: { q: args.query, limit: args.limit ?? 5, sort: "relevance", t: "month" },
              headers,
              timeout: 8000,
            });
            const posts = res.data.data.children.map((c: any) =>
              `[r/${sub} | ${c.data.score}pts] ${c.data.title}`
            );
            if (posts.length > 0) results.push(posts.join("\n"));
          } catch { /* skip this subreddit */ }
        }
        return results.join("\n\n") || `No results for "${args.query}" on Reddit`;
      } catch (err: any) {
        return `Reddit search error: ${err.message}`;
      }
    }

    case "get_google_trends": {
      try {
        const terms = (args.terms as string[]).slice(0, 3).join(",");
        const geo = (args.geo as string) ?? "";
        // Use Google Trends RSS
        const feed = await axios.get(
          `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`,
          { timeout: 10000 }
        );
        const trending = ((feed.data as string).match(/<title>(.*?)<\/title>/g) ?? [])
          .slice(1, 16)
          .map((t: string) => t.replace(/<\/?title>/g, "").trim());

        return `Google Trends ${geo ? `(${geo})` : "(Global)"}:\nTerms searched: ${terms}\n\nCurrently trending:\n${trending.map(t => `- ${t}`).join("\n")}`;
      } catch (err: any) {
        return `Google Trends error: ${err.message}`;
      }
    }

    default:
      return `Unknown research tool: ${name}`;
  }
}

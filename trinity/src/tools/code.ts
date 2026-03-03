/**
 * CODE TOOLS — GitHub API for autonomous code manipulation
 * Agents can read, write, create files, commit, open PRs.
 * This gives agents the ability to add new features to the platform.
 */

import axios from "axios";
import { GrokTool } from "../core/grok";

const GITHUB_API = "https://api.github.com";
const REPO = "IvanTatarchuk/genesis-node";

function ghHeaders() {
  return {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

// ── Tool definitions ───────────────────────────────────────────────────────────

export const CODE_TOOLS: GrokTool[] = [
  {
    name: "read_file",
    description: "Читає будь-який файл з GitHub репозиторію платформи",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Шлях до файлу (напр: app/page.tsx, components/AgentCard.tsx)" },
        branch: { type: "string", description: "Гілка (default: main)" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_files",
    description: "Переглядає список файлів у директорії репозиторію",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Директорія (напр: app, components, app/api)" },
        branch: { type: "string" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Записує або оновлює файл у репозиторії (автоматичний commit). Дозволяє додавати нові функції, компоненти, API маршрути.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Шлях до файлу" },
        content: { type: "string", description: "Повний вміст файлу" },
        commit_message: { type: "string", description: "Повідомлення коміту" },
        branch: { type: "string", description: "Гілка для запису (default: trinity-auto)" },
      },
      required: ["path", "content", "commit_message"],
    },
  },
  {
    name: "create_branch",
    description: "Створює нову гілку від main для розробки нової функції",
    parameters: {
      type: "object",
      properties: {
        branch_name: { type: "string", description: "Назва гілки (напр: trinity-feature-notifications-v2)" },
      },
      required: ["branch_name"],
    },
  },
  {
    name: "create_pull_request",
    description: "Створює Pull Request для мерджу нових функцій в main",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string", description: "Опис змін" },
        branch: { type: "string", description: "Гілка з змінами" },
      },
      required: ["title", "body", "branch"],
    },
  },
  {
    name: "merge_pull_request",
    description: "Мерджить Pull Request в main після перевірки",
    parameters: {
      type: "object",
      properties: {
        pr_number: { type: "number" },
        merge_message: { type: "string" },
      },
      required: ["pr_number"],
    },
  },
  {
    name: "get_recent_commits",
    description: "Показує останні коміти для розуміння що змінювалось",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Кількість комітів (default: 10)" },
        branch: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "search_codebase",
    description: "Шукає код у файлах репозиторію за ключовим словом",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Що шукати у коді" },
        file_extension: { type: "string", description: "Фільтр розширення (ts, tsx, py, sql)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_open_prs",
    description: "Переглядає відкриті Pull Requests",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "delete_branch",
    description: "Видаляє гілку після мерджу",
    parameters: {
      type: "object",
      properties: {
        branch_name: { type: "string" },
      },
      required: ["branch_name"],
    },
  },
];

// ── Tool executors ─────────────────────────────────────────────────────────────

export async function executeCodeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const branch = (args.branch as string) ?? "trinity-auto";

  switch (name) {
    case "read_file": {
      try {
        const res = await axios.get(`${GITHUB_API}/repos/${REPO}/contents/${args.path}`, {
          headers: ghHeaders(),
          params: { ref: args.branch ?? "main" },
        });
        const content = Buffer.from(res.data.content, "base64").toString("utf-8");
        return `FILE: ${args.path}\n\`\`\`\n${content.slice(0, 8000)}\n\`\`\``;
      } catch (err: any) {
        return `File not found: ${args.path}. Error: ${err.response?.data?.message ?? err.message}`;
      }
    }

    case "list_files": {
      try {
        const res = await axios.get(`${GITHUB_API}/repos/${REPO}/contents/${args.path}`, {
          headers: ghHeaders(),
          params: { ref: args.branch ?? "main" },
        });
        const items = Array.isArray(res.data) ? res.data : [res.data];
        return items.map((f: any) => `${f.type === "dir" ? "📁" : "📄"} ${f.path}`).join("\n");
      } catch (err: any) {
        return `Error listing: ${err.response?.data?.message ?? err.message}`;
      }
    }

    case "write_file": {
      try {
        // Ensure branch exists
        await ensureBranch(branch);

        // Get current file SHA if exists (needed for update)
        let sha: string | undefined;
        try {
          const existing = await axios.get(`${GITHUB_API}/repos/${REPO}/contents/${args.path}`, {
            headers: ghHeaders(),
            params: { ref: branch },
          });
          sha = existing.data.sha;
        } catch {
          // New file
        }

        const body: Record<string, unknown> = {
          message: `[Trinity] ${args.commit_message}`,
          content: Buffer.from(args.content as string).toString("base64"),
          branch,
        };
        if (sha) body.sha = sha;

        await axios.put(`${GITHUB_API}/repos/${REPO}/contents/${args.path}`, body, {
          headers: ghHeaders(),
        });

        return `✅ File written: ${args.path} on branch ${branch}\nCommit: ${args.commit_message}`;
      } catch (err: any) {
        return `Error writing file: ${err.response?.data?.message ?? err.message}`;
      }
    }

    case "create_branch": {
      try {
        await ensureBranch(args.branch_name as string);
        return `✅ Branch created: ${args.branch_name}`;
      } catch (err: any) {
        return `Error: ${err.response?.data?.message ?? err.message}`;
      }
    }

    case "create_pull_request": {
      try {
        const res = await axios.post(`${GITHUB_API}/repos/${REPO}/pulls`, {
          title: args.title,
          body: `${args.body}\n\n---\n_Автоматично створено Trinity агентами_`,
          head: args.branch,
          base: "main",
        }, { headers: ghHeaders() });
        return `✅ PR #${res.data.number} created: ${res.data.html_url}`;
      } catch (err: any) {
        return `Error creating PR: ${err.response?.data?.message ?? err.message}`;
      }
    }

    case "merge_pull_request": {
      try {
        await axios.put(`${GITHUB_API}/repos/${REPO}/pulls/${args.pr_number}/merge`, {
          commit_title: args.merge_message ?? "Trinity auto-merge",
          merge_method: "squash",
        }, { headers: ghHeaders() });
        return `✅ PR #${args.pr_number} merged into main`;
      } catch (err: any) {
        return `Error merging PR: ${err.response?.data?.message ?? err.message}`;
      }
    }

    case "get_recent_commits": {
      const res = await axios.get(`${GITHUB_API}/repos/${REPO}/commits`, {
        headers: ghHeaders(),
        params: { per_page: args.limit ?? 10, sha: args.branch ?? "main" },
      });
      return res.data.map((c: any) =>
        `[${c.sha.slice(0, 7)}] ${c.commit.message.split("\n")[0]} — ${c.commit.author.date}`
      ).join("\n");
    }

    case "search_codebase": {
      try {
        const q = `${args.query} repo:${REPO}${args.file_extension ? ` extension:${args.file_extension}` : ""}`;
        const res = await axios.get(`${GITHUB_API}/search/code`, {
          headers: ghHeaders(),
          params: { q, per_page: 10 },
        });
        return res.data.items.map((i: any) =>
          `${i.path}: ${i.text_matches?.[0]?.fragment ?? "match found"}`
        ).join("\n") || "No results found";
      } catch (err: any) {
        return `Search error: ${err.response?.data?.message ?? err.message}`;
      }
    }

    case "get_open_prs": {
      const res = await axios.get(`${GITHUB_API}/repos/${REPO}/pulls`, {
        headers: ghHeaders(),
        params: { state: "open" },
      });
      if (res.data.length === 0) return "No open PRs";
      return res.data.map((p: any) => `#${p.number}: ${p.title} (${p.head.ref})`).join("\n");
    }

    case "delete_branch": {
      try {
        await axios.delete(`${GITHUB_API}/repos/${REPO}/git/refs/heads/${args.branch_name}`, {
          headers: ghHeaders(),
        });
        return `✅ Branch ${args.branch_name} deleted`;
      } catch (err: any) {
        return `Error: ${err.response?.data?.message ?? err.message}`;
      }
    }

    default:
      return `Unknown code tool: ${name}`;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function ensureBranch(branchName: string): Promise<void> {
  // Get main SHA
  const mainRef = await axios.get(`${GITHUB_API}/repos/${REPO}/git/ref/heads/main`, {
    headers: ghHeaders(),
  });
  const sha = mainRef.data.object.sha;

  // Try to create branch
  try {
    await axios.post(`${GITHUB_API}/repos/${REPO}/git/refs`, {
      ref: `refs/heads/${branchName}`,
      sha,
    }, { headers: ghHeaders() });
  } catch (err: any) {
    // Branch already exists — that's OK
    if (!err.response?.data?.message?.includes("already exists")) {
      throw err;
    }
  }
}

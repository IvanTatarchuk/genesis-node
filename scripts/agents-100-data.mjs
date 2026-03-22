/**
 * 100 agents — data from app/million, app/page, app/pricing.
 */
const CATEGORIES = ["research", "coding", "automation", "content", "data", "marketing", "finance", "productivity", "ai-tools", "custom"];
const BASE = "You are an autonomous AI agent. Complete the user goal. End with: TASK_COMPLETE: <summary>";

const AGENTS = [
  { name: "Path to $1M — Strategy", desc: "Custom strategy and playbook to reach $1M ARR.", tags: ["strategy", "arr", "growth"], category: "marketing", prompt: "You help founders build a strategy to reach $1M ARR. " + BASE },
  { name: "Path to $1M — Advisory", desc: "1:1-style advisory and implementation support.", tags: ["advisory", "enterprise"], category: "finance", prompt: "You act as an advisory assistant. " + BASE },
  { name: "ARR Growth Playbook", desc: "Playbook and tactics to scale recurring revenue.", tags: ["arr", "playbook"], category: "marketing", prompt: "You create actionable playbooks for ARR growth. " + BASE },
  { name: "Web Researcher Pro", desc: "Deep web research and report generation.", tags: ["research", "web"], category: "research", prompt: "You research the web and produce reports. " + BASE },
  { name: "Code Reviewer Plus", desc: "Reviews repo and suggests improvements.", tags: ["code", "review"], category: "coding", prompt: "You review code and suggest fixes. " + BASE },
  { name: "Data Scraper Pro", desc: "Scrapes sites and exports CSV/JSON.", tags: ["scraping", "data"], category: "data", prompt: "You scrape and export structured data. " + BASE },
  { name: "SEO Content Writer", desc: "SEO-optimised articles and meta.", tags: ["seo", "content"], category: "content", prompt: "You write SEO-friendly content. " + BASE },
  { name: "Runway to $1M Calculator", desc: "MRR and growth to $1M ARR calculator.", tags: ["runway", "arr"], category: "custom", prompt: "You help with MRR/ARR and runway. " + BASE },
];

function slug(name, i) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) + "-" + (i + 1);
}

export function getAgentsData() {
  const out = [];
  for (let idx = 0; idx < 100; idx++) {
    const a = AGENTS[idx % AGENTS.length];
    const name = idx < AGENTS.length ? a.name : a.name + " " + (Math.floor(idx / AGENTS.length) + 1);
    out.push({
      name,
      slug: "agent-" + (idx + 1),
      description: a.desc,
      long_description: "## " + name + "\n\n" + a.desc,
      config_blob: { system_prompt: a.prompt },
      price_per_task: 50 + (idx % 15) * 5,
      tags: a.tags,
      category_slug: a.category,
    });
  }
  return out;
}

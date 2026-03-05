import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations – Connect AGENTS.DEV to Zapier, Make, n8n and more",
  description:
    "Connect AGENTS.DEV to 5000+ apps via Zapier, Make, and n8n. Trigger AI agents from Gmail, Notion, Slack, and any workflow.",
};

const INTEGRATIONS = [
  {
    name: "Zapier",
    logo: "⚡",
    description: "Connect AGENTS.DEV to 5,000+ apps. Trigger agents from Gmail, Sheets, CRM, Slack, and more.",
    badge: "Most popular",
    badgeColor: "text-amber-400 border-amber-700/60 bg-amber-900/20",
    steps: [
      "Create a Zap in Zapier",
      'Set trigger (e.g. "New row in Google Sheets")',
      'Add action: "Webhooks by Zapier → POST"',
      "URL: https://agents-dev-roan.vercel.app/api/v1/tasks",
      'Body: { "agent_slug": "your-agent", "goal": "{{your_data}}" }',
      'Add header: Authorization: Bearer gn_live_YOUR_KEY',
    ],
    color: "border-orange-500/30 bg-orange-950/10",
  },
  {
    name: "Make (Integromat)",
    logo: "🔮",
    description: "Build visual workflows with AGENTS.DEV as an HTTP module. 1,500+ integrations available.",
    badge: "Visual builder",
    badgeColor: "text-purple-400 border-purple-700/60 bg-purple-900/20",
    steps: [
      "Create a new Scenario in Make",
      "Add an HTTP module → Make a request",
      "Method: POST, URL: /api/v1/tasks",
      'Body: JSON { "agent_slug": "...", "goal": "..." }',
      "Set Authorization header with your API key",
      "Connect to any trigger (webhook, schedule, etc.)",
    ],
    color: "border-purple-500/30 bg-purple-950/10",
  },
  {
    name: "n8n",
    logo: "🔄",
    description: "Open-source workflow automation. Run on your own server and keep full data control.",
    badge: "Self-hosted",
    badgeColor: "text-red-400 border-red-700/60 bg-red-900/20",
    steps: [
      "Add an HTTP Request node in n8n",
      "Set Method: POST",
      "URL: https://agents-dev-roan.vercel.app/api/v1/tasks",
      "Add header: Authorization: Bearer YOUR_API_KEY",
      'JSON Body: { "agent_slug": "...", "goal": "..." }',
      "Connect to any trigger node (Webhook, Schedule, etc.)",
    ],
    color: "border-red-500/30 bg-red-950/10",
  },
  {
    name: "Webhooks (custom)",
    logo: "🔗",
    description: "Receive task completion events in your own app. Perfect for developers building on top of AGENTS.DEV.",
    badge: "Developer",
    badgeColor: "text-sky-400 border-sky-700/60 bg-sky-900/20",
    steps: [
      "Go to API Keys → Webhooks",
      "Register your HTTPS endpoint URL",
      "Choose events: task.completed, task.failed",
      'Receive JSON payload with task result at your URL',
      "Verify signature using HMAC-SHA256",
      "Build your own logic on top of results",
    ],
    color: "border-sky-500/30 bg-sky-950/10",
  },
];

const CODE_EXAMPLES = {
  curl: `curl -X POST https://agents-dev-roan.vercel.app/api/v1/tasks \\
  -H "Authorization: Bearer gn_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_slug": "web-researcher",
    "goal": "Find the top 5 SaaS tools for project management in 2025"
  }'`,

  js: `const res = await fetch("https://agents-dev-roan.vercel.app/api/v1/tasks", {
  method: "POST",
  headers: {
    "Authorization": "Bearer gn_live_YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    agent_slug: "web-researcher",
    goal: "Find the top 5 SaaS tools for project management in 2025",
  }),
});
const { task } = await res.json();
console.log("Task started:", task.id);`,

  python: `import requests

response = requests.post(
    "https://agents-dev-roan.vercel.app/api/v1/tasks",
    headers={
        "Authorization": "Bearer gn_live_YOUR_API_KEY",
        "Content-Type": "application/json",
    },
    json={
        "agent_slug": "web-researcher",
        "goal": "Find the top 5 SaaS tools for project management in 2025",
    },
)
task = response.json()["task"]
print(f"Task started: {task['id']}")`,
};

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav */}
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white">G</div>
            <span className="font-semibold text-slate-200 text-sm">GENESIS NODE</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/marketplace" className="text-slate-400 hover:text-white transition">Marketplace</Link>
            <Link href="/login" className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition">
              Get API key →
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-14 space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            5,000+ apps supported
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Connect AI agents to{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              your existing tools
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Trigger agents from Zapier, Make, n8n, or your own code. 
            Get results delivered back to where your team works.
          </p>
        </div>

        {/* Integration cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.name}
              className={`rounded-2xl border p-6 space-y-4 ${integration.color}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{integration.logo}</span>
                  <div>
                    <h3 className="font-semibold text-slate-100">{integration.name}</h3>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${integration.badgeColor}`}>
                      {integration.badge}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-400">{integration.description}</p>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-300 mb-2">How to set up:</p>
                {integration.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                    <span className="shrink-0 text-indigo-500 font-mono">{i + 1}.</span>
                    <code className="font-mono text-slate-400">{step}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Code examples */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white text-center">
            REST API — deploy agents programmatically
          </h2>
          <div className="space-y-4">
            {Object.entries(CODE_EXAMPLES).map(([lang, code]) => (
              <div key={lang} className="rounded-xl border border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between bg-slate-900 px-4 py-2 border-b border-slate-800">
                  <span className="text-xs font-medium text-slate-400 uppercase">{lang}</span>
                </div>
                <pre className="p-4 text-xs text-slate-300 overflow-x-auto bg-slate-950 leading-relaxed">
                  <code>{code}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Get API key CTA */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 to-slate-900/60 p-8 text-center space-y-4">
          <p className="text-2xl font-bold text-white">Ready to integrate?</p>
          <p className="text-slate-400 text-sm">Get your API key in the dashboard. Pro and Agency plans get full API access.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/api-keys"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
            >
              Get API key →
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-2.5 text-sm text-slate-300 hover:border-slate-500 transition">
              See pricing
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

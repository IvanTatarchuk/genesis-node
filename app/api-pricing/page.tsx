import type { Metadata } from "next";
import Link from "next/link";
import { Check, Zap, Code, Shield } from "lucide-react";
import { FAQSchema } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "API Access & Pricing — AGENTS.DEV",
  description: "Get programmatic access to 100+ AI agents. Launch autonomous agents from any app via REST API. Pay-per-task or monthly subscription.",
};

const PLANS = [
  {
    id:       "starter",
    name:     "Starter",
    price:    0,
    period:   "free",
    color:    "slate",
    features: [
      "100 free credits on signup",
      "Web access (manual tasks only)",
      "Task templates",
      "Public gallery access",
      "Community support",
    ],
    cta:      "Get Started",
    href:     "/login",
    highlight: false,
  },
  {
    id:       "pro",
    name:     "Pro",
    price:    29,
    period:   "/month",
    color:    "indigo",
    features: [
      "500 credits/month included",
      "REST API access",
      "API key management",
      "Webhooks for task events",
      "Scheduled tasks (cron)",
      "20 concurrent tasks",
      "AI Support chat",
      "Priority queue",
    ],
    cta:      "Start Pro",
    href:     "/pricing?plan=pro",
    highlight: true,
  },
  {
    id:       "agency",
    name:     "Agency",
    price:    99,
    period:   "/month",
    color:    "violet",
    features: [
      "2000 credits/month included",
      "All Pro features",
      "Team workspace (10 seats)",
      "Shared credit pool",
      "Custom webhooks + HMAC",
      "100 concurrent tasks",
      "SLA 99.9% uptime",
      "Dedicated support",
      "Custom agent onboarding",
    ],
    cta:      "Start Agency",
    href:     "/pricing?plan=agency",
    highlight: false,
  },
  {
    id:       "enterprise",
    name:     "Enterprise",
    price:    null,
    period:   "custom",
    color:    "amber",
    features: [
      "Unlimited credits",
      "Private cloud deployment",
      "Custom agent development",
      "On-premise option",
      "SSO / SAML",
      "Custom SLA",
      "Dedicated infrastructure",
      "White-label option",
    ],
    cta:      "Contact Sales",
    href:     "mailto:sales@agents.dev",
    highlight: false,
  },
];

const FAQS = [
  { q: "What is 1 API credit?", a: "1 credit = $0.01. Each agent charges between 1–200 credits per task depending on complexity. You can see pricing on each agent's page." },
  { q: "How do API keys work?", a: "Generate a key at /api-keys. Send it as Authorization: Bearer {key} header. POST to /api/v1/tasks with agent_id and goal. Simple." },
  { q: "Can I test the API for free?", a: "Yes! New accounts get 100 free credits — enough for 10-50 tasks depending on the agent." },
  { q: "What rate limits apply?", a: "Free: 10 tasks/min. Pro: 30 tasks/min, 20 concurrent. Agency: 100 concurrent. Enterprise: custom." },
  { q: "Do unused credits roll over?", a: "Monthly included credits reset. Purchased credit packs never expire." },
  { q: "Can I use MATADORA to pay for tasks?", a: "Coming soon! We're building MATADORA → credit conversion." },
];

export default function ApiPricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <FAQSchema faqs={FAQS} />
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white">G</div>
            <span className="font-semibold text-slate-200 text-sm">GENESIS NODE</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/integrations" className="text-sm text-slate-400 hover:text-white transition">Docs</Link>
            <Link href="/login" className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition">
              Get API Key
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-16 space-y-20">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-400 font-medium">
            <Code className="h-3 w-3" /> REST API · Webhooks · SDKs
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white">
            Build with AI Agents
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Integrate 100+ autonomous AI agents into any product. 
            Pay per task. Scale to millions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-yellow-400" /> 3-line integration</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-emerald-400" /> HMAC-signed webhooks</span>
            <span>·</span>
            <span>Works with Zapier, Make, n8n</span>
          </div>
        </div>

        {/* Quick start */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Quick start (3 lines)</h2>
          <pre className="rounded-xl bg-slate-950 p-4 text-sm text-slate-300 overflow-x-auto border border-slate-800">
{`curl -X POST https://agents-dev-roan.vercel.app/api/v1/tasks \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"agent_id":"competitor-research","goal":"Analyze top 3 competitors of Notion"}'`}
          </pre>
          <p className="text-xs text-slate-500">Get your API key at <Link href="/api-keys" className="text-indigo-400 hover:underline">/api-keys</Link></p>
        </div>

        {/* Pricing cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`rounded-2xl border p-6 flex flex-col ${
              plan.highlight
                ? "border-indigo-500/50 bg-gradient-to-b from-indigo-950/60 to-slate-900 shadow-lg shadow-indigo-500/10"
                : "border-slate-800 bg-slate-900/40"
            }`}>
              {plan.highlight && (
                <div className="text-xs text-indigo-400 font-bold mb-2">MOST POPULAR</div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                {plan.price !== null ? (
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-white">${plan.price}</span>
                    <span className="text-slate-500 text-sm">{plan.period}</span>
                  </div>
                ) : (
                  <div className="text-2xl font-black text-white mt-1">Custom</div>
                )}
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
                    <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`w-full rounded-xl py-2.5 text-center text-sm font-semibold transition ${
                  plan.highlight
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : plan.id === "enterprise"
                    ? "border border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                    : "border border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Credit packs */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Pay-As-You-Go Credit Packs</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { credits: 500,   price: 5,   label: "Starter",  bonus: "" },
              { credits: 2200,  price: 20,  label: "Growth",   bonus: "+200 bonus" },
              { credits: 6000,  price: 50,  label: "Scale",    bonus: "+1000 bonus" },
              { credits: 15000, price: 100, label: "Business", bonus: "+3000 bonus" },
            ].map(({ credits, price, label, bonus }) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                <div className="text-xs text-slate-500 mb-1">{label}</div>
                <div className="text-2xl font-black text-white">${price}</div>
                <div className="text-indigo-400 font-semibold mt-1">{credits.toLocaleString()} credits</div>
                {bonus && <div className="text-xs text-amber-400 mt-0.5">{bonus}</div>}
                <Link
                  href={`/pricing?pack=${price}`}
                  className="mt-3 block rounded-lg border border-slate-700 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  Buy pack
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">FAQ</h2>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-200 flex items-center justify-between">
                  {q}
                  <span className="text-slate-600 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

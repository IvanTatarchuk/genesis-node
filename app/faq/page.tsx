import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — Genesis Node",
  description: "Frequently asked questions about billing, agents, API, and the platform.",
};

const SECTIONS = [
  {
    title: "Billing & credits",
    items: [
      { q: "How are credits charged?", a: "Credits are deducted only when a task actually runs and completes. If a task fails or is cancelled, credits are refunded automatically. Each agent sets its own price per run." },
      { q: "Do credits expire?", a: "No. Unused credits roll over month to month. There's no pressure to use them by a certain date." },
      { q: "Can I get a refund?", a: "Failed or cancelled tasks are refunded automatically. For subscription or one-time purchase issues, contact support — we'll help." },
      { q: "What payment methods do you accept?", a: "We use Stripe for secure card payments. No card is required to start — you get free credits on signup." },
    ],
  },
  {
    title: "Agents & tasks",
    items: [
      { q: "What is an agent?", a: "An agent is an AI-powered tool that performs a specific task (e.g. SEO audit, content generation, research). You set a goal, the agent runs, and you get a result." },
      { q: "What if my task fails?", a: "Credits are refunded automatically. You can try again with a different goal or another agent. If it keeps failing, contact support." },
      { q: "Can I run the same agent multiple times?", a: "Yes. Each run is a separate task. You pay per run according to the agent's price." },
      { q: "How do I choose an agent?", a: "Browse the marketplace by category or search. Read the description and reviews. You can run a free demo (SEO scan) on the homepage without signing up." },
      { q: "How does Genesis Node compare to Zapier, Make, or other automation tools?", a: "We're an AI agent marketplace: pay per task (credits), not per seat. You get voice control, automatic refunds if a task fails, no lock-in, and developers earn 70–90%. See the Compare page for a full breakdown." },
    ],
  },
  {
    title: "API & developers",
    items: [
      { q: "Is there an API?", a: "Yes. Authenticate with an API key from your dashboard, then POST to /api/v1/tasks with agent_slug and goal. See the API pricing page and integrations for details." },
      { q: "How do I publish my own agent?", a: "Sign in, switch your role to Developer in the dashboard, then go to Register new agent. You'll set name, description, price per task, and context. Once approved, it appears in the marketplace." },
      { q: "What revenue do developers get?", a: "Developers earn 70–90% of every credit spent on their agent, depending on tier. Payouts are processed weekly via Stripe Connect." },
    ],
  },
  {
    title: "Account & security",
    items: [
      { q: "How is my data handled?", a: "We use Supabase for auth and data. Tasks and results are tied to your account. You can export your data from the Data page in the dashboard." },
      { q: "Who can see my tasks?", a: "By default, only you. You can optionally share a task result via a public link. We don't sell your data." },
      { q: "I need help.", a: "Use the Support page for 24/7 AI help, or contact us for human support. We're here to help." },
    ],
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-grid-dark opacity-20" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <span className="font-semibold text-slate-200">GENESIS NODE</span>
          </Link>
          <Link href="/support" className="text-sm text-slate-500 hover:text-slate-300 transition">Support</Link>
        </nav>

        <h1 className="text-3xl font-bold text-white mb-2">Frequently asked questions</h1>
        <p className="text-slate-400 mb-12">Billing, agents, API, and more. Can&apos;t find an answer? <Link href="/support" className="text-indigo-400 hover:underline">Contact support</Link>.</p>

        <div className="space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-slate-200 mb-6">{section.title}</h2>
              <div className="space-y-4">
                {section.items.map(({ q, a }) => (
                  <div key={q} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                    <p className="font-medium text-slate-100 text-sm">{q}</p>
                    <p className="mt-2 text-sm text-slate-400 leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/" className="text-indigo-400 hover:underline text-sm">← Back to home</Link>
        </div>
      </div>
    </main>
  );
}

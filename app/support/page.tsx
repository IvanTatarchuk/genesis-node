import type { Metadata } from "next";
import SupportChat from "@/components/SupportChat";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support – AGENTS.DEV",
  description: "Get instant help from our AI support agent. Available 24/7 for questions about billing, agents, API, and more.",
};

const QUICK_QUESTIONS = [
  "How do I get started for free?",
  "How are credits charged?",
  "My task failed — will I be refunded?",
  "How do I get an API key?",
  "How does MATADORA currency work?",
  "Can I use agents in my own app?",
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white">G</div>
            <span className="font-semibold text-slate-200 text-sm">GENESIS NODE</span>
          </Link>
          <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white transition">Marketplace</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-2xl">🤖</div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">AI</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Support</h1>
          <p className="text-slate-400 text-sm">Powered by Claude. Available 24/7. We&apos;re here to help — our mission is to serve millions of people.</p>
        </div>

        {/* Quick questions */}
        <div>
          <p className="text-xs text-slate-600 mb-2 text-center">Quick questions</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                data-quick={q}
                className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 hover:border-indigo-500/60 hover:text-slate-200 hover:bg-slate-800 transition quick-q"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <SupportChat />

        {/* Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[
            { label: "FAQ", href: "/faq" },
            { label: "Docs", href: "/integrations" },
            { label: "Pricing", href: "/pricing" },
            { label: "Marketplace", href: "/marketplace" },
            { label: "Templates", href: "/templates" },
            { label: "Status", href: "/status" },
          ].map(({ label, href }) => (
            <Link key={label} href={href} className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-xs text-slate-500 hover:text-slate-200 hover:border-slate-700 transition">
              {label}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

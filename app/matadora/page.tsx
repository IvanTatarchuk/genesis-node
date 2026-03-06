import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase-server";
import MatadoraClient from "@/components/MatadoraClient";
import MatadoraStaking from "@/components/MatadoraStaking";
import Link from "next/link";
import { FAQSchema } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "MATADORA — Platform Currency | AGENTS.DEV",
  description: "MATADORA is the native currency of AGENTS.DEV. Earn it by completing tasks, publishing agents, and referring friends. Exchange for real USD.",
};

const FAQS = [
  { q: "What is MATADORA?", a: "MATADORA is the native platform currency of AGENTS.DEV. You earn it by using the platform and can exchange it for real USD." },
  { q: "How do I earn MATADORA?", a: "Complete tasks (+5), log in daily (+10), hit streaks, publish agents (+500), refer friends (+200), and reach the leaderboard (+1000)." },
  { q: "What is the exchange rate?", a: "The exchange rate fluctuates based on platform activity. Starting rate: 1 MATADORA = $0.01. The more platform volume, the higher the rate." },
  { q: "How do I exchange MATADORA to USD?", a: "Go to your MATADORA wallet, request an exchange (minimum 1,000 MATADORA = $10), and we'll send a Stripe payout within 1-3 business days." },
  { q: "Is MATADORA a cryptocurrency?", a: "No, MATADORA is a platform reward currency — not a blockchain token. It's redeemable for USD via the platform." },
  { q: "Can I buy MATADORA?", a: "Currently MATADORA is earned-only. You cannot purchase it directly." },
];

export default async function MatadoraPage() {
  // Fetch live market rate
  const service = createServiceClient();
  const { data: rateRow } = await service
    .from("matadora_market_rates")
    .select("rate_usd, market_cap, volume_24h")
    .order("created_at", { ascending: false })
    .limit(1)
    .single() as { data: { rate_usd: number; market_cap: number; volume_24h: number } | null };

  const rate = rateRow?.rate_usd ?? 0.01;

  // Total MATADORA earned across platform
  type MatadoraStats = { total_earned: number; total_wallets: number; avg_balance: number };
  let statsRow: MatadoraStats | null = null;
  try {
    const { data } = await service.rpc("get_matadora_stats");
    const rows = data as MatadoraStats[] | MatadoraStats | null;
    statsRow = Array.isArray(rows) ? rows[0] ?? null : rows;
  } catch { /* non-critical */ }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <FAQSchema faqs={FAQS} />
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white">G</div>
            <span className="font-semibold text-slate-200 text-sm">GENESIS NODE</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">Dashboard</Link>
            <Link href="/pricing" className="rounded-full bg-amber-600 hover:bg-amber-500 px-4 py-1.5 text-sm font-medium text-white transition">
              Get Credits
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-12 space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-400 font-medium mb-2">
            🔥 Platform Native Currency
          </div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-400">
            MATADORA
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Earn by doing. Build wealth by building on AGENTS.DEV.<br />
            The more you contribute — the more you earn.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">${rate.toFixed(4)}</div>
              <div className="text-slate-600 text-xs">per MATADORA</div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            {statsRow && (
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{statsRow.total_wallets?.toLocaleString() ?? "—"}</div>
                <div className="text-slate-600 text-xs">holders</div>
              </div>
            )}
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">USD</div>
              <div className="text-slate-600 text-xs">redeemable</div>
            </div>
          </div>
        </div>

        {/* Earn ways */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { emoji: "✅", label: "Complete a task",   amount: "+5",    desc: "Run any agent task" },
            { emoji: "📅", label: "Daily login",        amount: "+10",   desc: "Visit the platform daily" },
            { emoji: "🔥", label: "7-day streak",       amount: "+100",  desc: "Login 7 days in a row" },
            { emoji: "🚀", label: "First task ever",    amount: "+50",   desc: "Complete your first task" },
            { emoji: "👥", label: "Refer a friend",     amount: "+200",  desc: "They sign up via your link" },
            { emoji: "🤖", label: "Publish an agent",   amount: "+500",  desc: "Launch your first agent" },
            { emoji: "🏆", label: "Top 10 weekly",      amount: "+1000", desc: "Hit the leaderboard" },
            { emoji: "🍴", label: "Pipeline forked",    amount: "+10",   desc: "Someone forks your pipeline" },
            { emoji: "⭐", label: "Write a review",     amount: "+2",    desc: "Rate a completed task" },
          ].map(({ emoji, label, amount, desc }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center gap-4 hover:border-amber-500/30 transition">
              <span className="text-3xl">{emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-200 text-sm">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <span className="text-amber-400 font-bold text-sm">{amount}</span>
            </div>
          ))}
        </div>

        {/* Live wallet */}
        <MatadoraClient currentRate={rate} />

        {/* Staking */}
        <MatadoraStaking />

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">FAQ</h2>
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

import type { Metadata } from "next";
import Link from "next/link";
import { TASK_TEMPLATES } from "@/lib/task-templates";

export const metadata: Metadata = {
  title: "B2B Lead Generation — AI agents for sales | GENESIS NODE",
  description:
    "Find leads, research companies, build lists. AI agents scrape and enrich B2B data. One click to deploy. Export to CSV or connect Zapier.",
};

const B2B_TEMPLATE_IDS = ["leads-scrape", "competitor-analysis", "linkedin-research", "market-research", "job-listings"];

export const revalidate = 3600;

export default async function B2bLeadsPage() {
  const templates = TASK_TEMPLATES.filter((t) => B2B_TEMPLATE_IDS.includes(t.id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white">G</div>
            <span className="font-semibold text-slate-200 text-sm">GENESIS NODE</span>
          </Link>
          <Link href="/integrations" className="text-sm text-slate-400 hover:text-white transition">Zapier & API</Link>
          <Link href="/login" className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition">Start free</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-16 space-y-14">
        <div className="text-center space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
            For sales & outbound teams
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            B2B leads on autopilot.{" "}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              No manual scraping.
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            AI agents find companies, pull contacts, and research decision-makers. Export to CSV or push to your CRM via Zapier.
          </p>
          <Link
            href="/templates?cat=research"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:brightness-110"
          >
            Browse lead & research templates →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/marketplace?template=${t.id}`}
              className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-500/40 hover:bg-slate-900"
            >
              <span className="text-3xl">{t.emoji}</span>
              <h3 className="mt-3 font-semibold text-slate-100 group-hover:text-sky-300 transition">{t.title}</h3>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{t.goal.replace(/\[.*?\]/g, "…")}</p>
              <p className="mt-3 text-[11px] text-sky-400 font-medium">Use template →</p>
            </Link>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-4">
          <p className="text-xl font-bold text-white">Connect Zapier or use the API</p>
          <p className="text-slate-400 text-sm">Trigger lead-gen agents from Google Sheets, HubSpot, or your own app.</p>
          <Link href="/integrations" className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-6 py-2.5 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20">
            See integrations →
          </Link>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface SeoIssue {
  severity: "critical" | "warning" | "ok";
  message: string;
}

interface SeoResult {
  url: string;
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  h1Count: number;
  h1Text: string | null;
  imgMissingAlt: number;
  canonical: string | null;
  robotsMeta: string | null;
  loadMs: number;
  score: number;
  issues: SeoIssue[];
}

const EXAMPLE_URLS = [
  "stripe.com",
  "vercel.com",
  "github.com",
];

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
      <circle
        cx="40" cy="40" r={r}
        fill="none" stroke="#1e293b" strokeWidth="8"
      />
      <circle
        cx="40" cy="40" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        className="transition-[stroke-dasharray] duration-[0.8s] ease-[ease]"
      />
      <text
        x="40" y="45"
        textAnchor="middle"
        fill={color}
        fontSize="18"
        fontWeight="700"
        fontFamily="inherit"
      >
        {score}
      </text>
    </svg>
  );
}

function IssueRow({ issue }: { issue: SeoIssue }) {
  const icon =
    issue.severity === "critical"
      ? "✗"
      : issue.severity === "warning"
      ? "⚠"
      : "✓";
  const color =
    issue.severity === "critical"
      ? "text-red-400"
      : issue.severity === "warning"
      ? "text-yellow-400"
      : "text-emerald-400";

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={`shrink-0 font-mono font-bold ${color}`}>{icon}</span>
      <span className="text-slate-300">{issue.message}</span>
    </div>
  );
}

export default function LiveDemoSection() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function scan(scanUrl?: string) {
    const target = (scanUrl ?? url).trim();
    if (!target) return;
    if (scanUrl) setUrl(scanUrl);
    setLoading(true);
    setResult(null);
    setError(null);

    // Simulate live terminal log
    const steps = [
      `[agent] Initializing scan for: ${target}`,
      `[playwright] Fetching ${target.startsWith("http") ? target : "https://" + target}`,
      `[parser]  Extracting SEO signals…`,
      `[scorer]  Computing SEO score…`,
      `[agent]  Analysis complete ✓`,
    ];
    setLogLines([]);
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 280 + i * 200));
      setLogLines((prev) => [...prev, steps[i]]);
    }

    try {
      const res = await fetch("/api/demo/seo-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong");
      }
      const data: SeoResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      {/* Header */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          ⭐ Today&apos;s free agent — no signup
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
          Live Demo — try it now
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          First result in{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            60 seconds
          </span>
        </h2>
        <p className="max-w-lg text-sm text-slate-400">
          Enter any URL. Our{" "}
          <span className="text-slate-200">Web Researcher</span> agent audits the page for SEO — no account needed.
        </p>
      </div>

      {/* Input */}
      <div className="mx-auto max-w-xl">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && scan()}
            placeholder="https://yoursite.com"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
          />
          <button
            onClick={() => scan()}
            disabled={loading || !url.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Scanning…
              </>
            ) : (
              "Scan"
            )}
          </button>
        </div>

        {/* Example URLs */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Try:</span>
          {EXAMPLE_URLS.map((u) => (
            <button
              key={u}
              onClick={() => scan(u)}
              disabled={loading}
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-400 transition hover:border-slate-700 hover:text-slate-200 disabled:opacity-40"
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal + Result */}
      {(loading || result || error) && (
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-2xl shadow-black/60 backdrop-blur overflow-hidden">
          {/* Terminal header */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
            <span className="ml-3 text-xs text-slate-500 font-mono">
              genesis-node — web-researcher
            </span>
          </div>

          {/* Terminal log */}
          <div className="px-4 py-3 font-mono text-xs text-slate-400 space-y-1 min-h-[80px]">
            {logLines.map((line, i) => (
              <div key={i} className="animate-[fadeSlideIn_0.25s_ease]">
                <span className="text-slate-600 select-none">$ </span>
                {line}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1 text-indigo-400">
                <span className="text-slate-600 select-none">$ </span>
                <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse rounded-sm" />
              </div>
            )}
          </div>

          {/* Result panel */}
          {result && (
            <div className="border-t border-slate-800 p-5 space-y-5">
              {/* Score + overview */}
              <div className="flex items-center gap-5">
                <ScoreRing score={result.score} />
                <div>
                  <p className="text-lg font-semibold text-slate-100">
                    SEO Score:{" "}
                    <span
                      className={
                        result.score >= 80
                          ? "text-emerald-400"
                          : result.score >= 50
                          ? "text-yellow-400"
                          : "text-red-400"
                      }
                    >
                      {result.score}/100
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 truncate max-w-xs">
                    {result.url}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>⏱ {result.loadMs}ms response</span>
                    <span>🖼 {result.imgMissingAlt} imgs missing alt</span>
                    <span>H1 × {result.h1Count}</span>
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              {result.title && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Title tag
                  </p>
                  <p className="text-sm text-slate-200 font-medium line-clamp-1">
                    {result.title}
                  </p>
                </div>
              )}
              {result.description && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Meta description
                  </p>
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {result.description}
                  </p>
                </div>
              )}

              {/* Issues list */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  Findings
                </p>
                {result.issues.map((issue, i) => (
                  <IssueRow key={i} issue={issue} />
                ))}
              </div>

              {/* CTA — save result & get more (non-standard conversion) */}
              <div className="pt-4 mt-4 border-t border-slate-800 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-200">
                  Like this? Save the result and get 3 more free scans — no credit card.
                </p>
                <p className="text-xs text-slate-400">
                  Sign up to run more agents, save reports in your dashboard, and unlock full SEO audits.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/login?next=/marketplace"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
                  >
                    Sign up free →
                  </Link>
                  <Link
                    href="/marketplace"
                    className="text-sm text-slate-400 hover:text-slate-200 transition"
                  >
                    Just browse agents
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="border-t border-slate-800 px-5 py-4">
              <p className="text-sm text-amber-300">
                We couldn&apos;t run the scan right now. Please try again or contact support if it keeps happening.
              </p>
              <p className="mt-1 text-xs text-slate-500">Details: {error}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

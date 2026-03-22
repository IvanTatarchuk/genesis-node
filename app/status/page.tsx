"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Status = "operational" | "degraded" | "down" | "loading";

export default function StatusPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const checkTime = new Date().toISOString();
    fetch(`${base}/api/health`)
      .then((res) => {
        if (cancelled) return;
        setLastChecked(checkTime);
        if (res.ok) setStatus("operational");
        else setStatus("degraded");
      })
      .catch(() => {
        if (!cancelled) {
          setLastChecked(checkTime);
          setStatus("down");
        }
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-grid-dark opacity-20" />
      <div className="relative z-10 mx-auto max-w-lg px-6 py-16">
        <nav className="mb-12">
          <Link href="/" className="text-slate-400 hover:text-white transition text-sm">← Home</Link>
        </nav>

        <h1 className="text-2xl font-bold text-white mb-2">System status</h1>
        <p className="text-slate-400 text-sm mb-8">Current status of Genesis Node services.</p>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">Platform API</span>
            {status === "loading" && (
              <span className="inline-flex items-center gap-1.5 text-sky-400 text-sm">
                <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" /> Checking…
              </span>
            )}
            {status === "operational" && (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Operational
              </span>
            )}
            {status === "degraded" && (
              <span className="inline-flex items-center gap-1.5 text-amber-400 text-sm">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Degraded
              </span>
            )}
            {status === "down" && (
              <span className="inline-flex items-center gap-1.5 text-red-400 text-sm">
                <span className="h-2 w-2 rounded-full bg-red-400" /> Down
              </span>
            )}
          </div>
          {lastChecked && (
            <p className="text-xs text-slate-500">Last checked: {new Date(lastChecked).toLocaleString()}</p>
          )}
        </div>

        <p className="mt-8 text-xs text-slate-600">
          If you&apos;re experiencing issues, please <Link href="/support" className="text-indigo-400 hover:underline">contact support</Link>.
        </p>
      </div>
    </main>
  );
}

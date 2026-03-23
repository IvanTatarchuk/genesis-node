"use client";

import { useState } from "react";
import Link from "next/link";

interface Scientist {
  slug: string;
  name: string;
  emoji: string;
  title: string;
  color: string;
}

export default function LabClient({ scientists }: { scientists: Scientist[] }) {
  const [topic, setTopic] = useState("");
  const [selected, setSelected] = useState<string[]>(["einstein-ai", "turing-ai", "lovelace-ai"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function toggleScientist(slug: string) {
    setSelected(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug].slice(0, 5)
    );
  }

  async function startSession() {
    if (!topic.trim() || selected.length < 2) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/lab/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), participants: selected }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`Session started! ${selected.length} scientists working on: "${topic}"`);
        setTopic("");
      } else {
        setResult(`Error: ${data.error ?? "Failed to start session"}`);
      }
    } catch {
      setResult("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-300 mb-2">Start new collaboration session</p>
        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Give the scientists a topic… e.g. 'Build a SaaS platform for construction project management' or 'Design a quantum computing startup'"
          rows={3}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <p className="text-[10px] text-slate-500 mb-2">Select scientists (max 5): {selected.length}/5</p>
        <div className="flex flex-wrap gap-1.5">
          {scientists.map(s => (
            <button
              key={s.slug}
              type="button"
              onClick={() => toggleScientist(s.slug)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                selected.includes(s.slug)
                  ? "bg-indigo-600/40 border border-indigo-500/60 text-indigo-200"
                  : "bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <span>{s.emoji}</span>
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={startSession}
        disabled={loading || !topic.trim() || selected.length < 2}
        className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-2 text-xs font-bold text-white disabled:opacity-40 hover:brightness-110 transition"
      >
        {loading ? "Starting session…" : `🧬 Start Lab Session with ${selected.length} scientists`}
      </button>

      {result && (
        <p className="text-[11px] text-center text-emerald-400">{result}</p>
      )}

      <p className="text-[10px] text-slate-600 text-center">
        Requires login ·{" "}
        <Link href="/login" className="text-indigo-400 hover:underline">Sign in to activate</Link>
      </p>
    </div>
  );
}

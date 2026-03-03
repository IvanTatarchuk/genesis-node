"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AgentOption {
  id:            string;
  name:          string;
  slug:          string;
  description:   string;
  price_per_task: number;
}

interface Step {
  agent_id:    string;
  agent_name:  string;
  description: string;
  price:       number;
}

interface Props {
  availableAgents: AgentOption[];
}

export default function PipelineBuilder({ availableAgents }: Props) {
  const router = useRouter();
  const [name,         setName]        = useState("");
  const [slug,         setSlug]        = useState("");
  const [description,  setDesc]        = useState("");
  const [steps,        setSteps]       = useState<Step[]>([]);
  const [pricePerRun,  setPricePerRun] = useState(200);
  const [tags,         setTags]        = useState<string[]>([]);
  const [submitting,   setSubmitting]  = useState(false);
  const [error,        setError]       = useState("");
  const [customTag,    setCustomTag]   = useState("");

  function handleNameChange(v: string) {
    setName(v);
    setSlug(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 48));
  }

  function addStep(agent: AgentOption) {
    if (steps.find((s) => s.agent_id === agent.id)) return;
    setSteps((prev) => [
      ...prev,
      { agent_id: agent.id, agent_name: agent.name, description: agent.description, price: agent.price_per_task },
    ]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveStep(idx: number, dir: -1 | 1) {
    setSteps((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  }

  function addTag() {
    const t = customTag.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setCustomTag("");
  }

  const totalCost = steps.reduce((s, step) => s + step.price, 0);
  const rec = Math.max(totalCost, 50);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !slug.trim()) { setError("Name and slug are required"); return; }
    if (steps.length < 2) { setError("Add at least 2 agents to your pipeline"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/pipelines", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, slug, description,
          steps: steps.map((s, i) => ({ ...s, order: i })),
          price_per_run: pricePerRun,
          tags,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create pipeline"); return; }
      router.push(`/marketplace?success=pipeline`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">

      {/* ── Basic info ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">
          1. Pipeline info
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Name *</label>
            <input value={name} onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Research → Write → Publish" className={inputCls} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Slug *</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="research-write-publish" className={inputCls} required />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Description</label>
          <textarea value={description} onChange={(e) => setDesc(e.target.value)}
            rows={3} placeholder="What does this pipeline automate end-to-end?"
            className={inputCls + " resize-none"} />
        </div>
      </div>

      {/* ── Step builder ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">
          2. Add agents in order (min 2, max 8)
        </h2>

        {/* Steps list */}
        {steps.length > 0 && (
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={step.agent_id}
                className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0}
                    className="text-slate-600 hover:text-slate-300 disabled:opacity-20 text-xs leading-none">▲</button>
                  <button type="button" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}
                    className="text-slate-600 hover:text-slate-300 disabled:opacity-20 text-xs leading-none">▼</button>
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-600/30 text-xs font-bold text-indigo-400">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{step.agent_name}</p>
                  <p className="text-xs text-slate-500 truncate">{step.description}</p>
                </div>
                <span className="text-xs text-slate-500 shrink-0">⚡ {step.price} cr</span>
                <button type="button" onClick={() => removeStep(i)}
                  className="shrink-0 text-slate-600 hover:text-red-400 transition text-sm">✕</button>
              </div>
            ))}

            {/* Arrow connector */}
            {steps.length >= 2 && (
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                <span className="text-xs text-indigo-500/60">output → input</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
              </div>
            )}
          </div>
        )}

        {/* Agent picker */}
        {steps.length < 8 && (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-3 space-y-2">
            <p className="text-xs text-slate-500 text-center mb-3">
              {steps.length === 0 ? "Add your first agent" : `Add step ${steps.length + 1}`}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {availableAgents.map((agent) => {
                const already = steps.some((s) => s.agent_id === agent.id);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    disabled={already}
                    onClick={() => addStep(agent)}
                    className={`flex items-start gap-2 rounded-xl border p-3 text-left transition ${
                      already
                        ? "border-slate-800 opacity-40 cursor-not-allowed"
                        : "border-slate-700 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-indigo-950/20"
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-base">🤖</div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{agent.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{agent.description}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">⚡ {agent.price_per_task} cr</p>
                    </div>
                    {already && <span className="ml-auto text-[10px] text-slate-600">added</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Pricing ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">
          3. Pricing
        </h2>
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Sum of agent costs:</span>
            <span className="font-semibold text-slate-200">⚡ {totalCost} credits</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Recommended price:</span>
            <span className="font-semibold text-emerald-400">⚡ {rec} credits</span>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Your price per run (credits)
            </label>
            <input
              type="number"
              value={pricePerRun}
              min={10}
              aria-label="Price per run in credits"
              placeholder="200"
              onChange={(e) => setPricePerRun(Math.max(10, parseInt(e.target.value) || 10))}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-slate-600">
              You earn {Math.floor(pricePerRun * 0.7)}–{Math.floor(pricePerRun * 0.9)} credits per run (70–90% depending on your level)
            </p>
          </div>
        </div>
      </div>

      {/* ── Tags ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">4. Tags</h2>
        <div className="flex gap-2">
          <input value={customTag} onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add tag (Enter)" className={inputCls} />
          <button type="button" onClick={addTag}
            className="shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-300 hover:border-slate-600 transition">
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-indigo-700/50 bg-indigo-950/30 px-2.5 py-1 text-xs text-indigo-300">
                {t}
                <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))}
                  className="text-indigo-500 hover:text-red-400 transition text-[10px]">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-700/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || steps.length < 2}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 disabled:opacity-50"
      >
        {submitting ? "Publishing pipeline…" : "🔗 Publish pipeline"}
      </button>
    </form>
  );
}

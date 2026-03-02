"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, TrashIcon, InfoIcon, BoltIcon } from "lucide-react";

interface Props {
  creatorId: string;
}

const SUGGESTED_TAGS = [
  "coding", "browser", "research", "automation",
  "writing", "data", "testing", "scraping",
];

export default function RegisterAgentForm({ creatorId }: Props) {
  const router = useRouter();

  const [name,            setName]            = useState("");
  const [slug,            setSlug]            = useState("");
  const [description,     setDescription]     = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [systemPrompt,    setSystemPrompt]    = useState("");
  const [pricePerTask,    setPricePerTask]     = useState(100);
  const [tags,            setTags]            = useState<string[]>([]);
  const [customTag,       setCustomTag]       = useState("");
  const [error,           setError]           = useState("");
  const [submitting,      setSubmitting]      = useState(false);

  // Auto-generate slug from name
  function handleNameChange(v: string) {
    setName(v);
    setSlug(
      v
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 48)
    );
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function addCustomTag() {
    const t = customTag.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setCustomTag("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !slug.trim() || !description.trim()) {
      setError("Name, slug and short description are required.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/agents", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_id:       creatorId,
          name:             name.trim(),
          slug:             slug.trim(),
          description:      description.trim(),
          long_description: longDescription.trim() || null,
          config_blob: {
            system_prompt: systemPrompt.trim(),
          },
          price_per_task: pricePerTask,
          tags,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }

      router.push(`/dashboard?registered=${json.agent.slug}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name + slug */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Agent name" required>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. DevAgent Pro"
            maxLength={60}
            className={inputCls}
            required
          />
        </Field>
        <Field label="Slug (URL identifier)" required hint="Auto-generated, must be unique">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">agents/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="devagent-pro"
              maxLength={48}
              className={inputCls + " flex-1"}
              required
            />
          </div>
        </Field>
      </div>

      {/* Short description */}
      <Field label="Short description" required hint="One-liner shown in marketplace cards">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Autonomous coding & browser automation agent powered by Grok-3."
          maxLength={160}
          className={inputCls}
          required
        />
        <p className="mt-1 text-right text-[11px] text-slate-600">{description.length}/160</p>
      </Field>

      {/* Long description */}
      <Field label="Full description" hint="Supports Markdown — shown on the agent's detail page">
        <textarea
          value={longDescription}
          onChange={(e) => setLongDescription(e.target.value)}
          placeholder={`## What this agent does\n\nDescribe capabilities, use cases, limitations...\n\n## How to write a good goal\n\nProvide examples of effective goal prompts.`}
          rows={8}
          className={inputCls + " resize-y font-mono text-xs leading-relaxed"}
        />
      </Field>

      {/* System prompt */}
      <Field
        label="System prompt / context"
        hint="This is injected as the agent's instructions. Keep it concise and task-focused."
      >
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder={`You are DevAgent, an autonomous software engineering agent.\nYou receive a GOAL and must complete it step-by-step using available tools.\nAlways log your reasoning before taking actions.`}
          rows={6}
          className={inputCls + " resize-y font-mono text-xs leading-relaxed"}
        />
      </Field>

      {/* Price */}
      <Field label="Price per task (credits)" hint="1 credit = $0.01 USD · Minimum 10 credits">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <BoltIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-400 pointer-events-none" />
            <input
              type="number"
              min={10}
              max={100000}
              value={pricePerTask}
              onChange={(e) => setPricePerTask(Math.max(10, Number(e.target.value)))}
              className={inputCls + " pl-9"}
            />
          </div>
          <span className="shrink-0 text-sm text-slate-500">
            = ${(pricePerTask / 100).toFixed(2)} per task
          </span>
        </div>

        {/* Price presets */}
        <div className="mt-2 flex flex-wrap gap-2">
          {[50, 100, 250, 500, 1000].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPricePerTask(p)}
              className={`rounded-lg border px-3 py-1 text-xs transition ${
                pricePerTask === p
                  ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                  : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
              }`}
            >
              {p} cr · ${(p / 100).toFixed(2)}
            </button>
          ))}
        </div>
      </Field>

      {/* Tags */}
      <Field label="Tags" hint="Help clients discover your agent">
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-lg border px-3 py-1 text-xs transition ${
                tags.includes(tag)
                  ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                  : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Custom tag input */}
        <div className="mt-3 flex items-center gap-2">
          <input
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
            placeholder="Add custom tag…"
            className={inputCls + " flex-1 text-xs"}
            maxLength={20}
          />
          <button
            type="button"
            onClick={addCustomTag}
            className="flex items-center gap-1 rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition"
          >
            <PlusIcon className="h-3 w-3" /> Add
          </button>
        </div>

        {/* Selected tags */}
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-md bg-indigo-600/20 border border-indigo-500/40 px-2 py-0.5 text-xs text-indigo-300"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="hover:text-red-400 transition"
                >
                  <TrashIcon className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-800/60 bg-red-900/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Note about Docker */}
      <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
        <InfoIcon className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
        <p>
          After registration, the platform will spin up your agent using the Docker image{" "}
          <code className="text-indigo-300">genesis-node/devagent:latest</code>. Make sure
          you&apos;ve built and pushed the image, or contact us to onboard your agent manually.
        </p>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-slate-500 hover:text-slate-300 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 px-6 py-2.5 text-sm font-medium text-slate-950 shadow-md shadow-indigo-500/30 transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Registering…" : "Register agent →"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-medium text-slate-300">
          {label}
          {required && <span className="ml-0.5 text-indigo-400">*</span>}
        </label>
        {hint && <span className="text-[11px] text-slate-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

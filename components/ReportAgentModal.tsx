"use client";

import { useState } from "react";
import { FlagIcon, XIcon } from "lucide-react";

const REASONS = [
  { value: "spam", label: "Spam or low quality" },
  { value: "harmful", label: "Harmful or unsafe" },
  { value: "misleading", label: "Misleading description or results" },
  { value: "copyright", label: "Copyright or trademark issue" },
  { value: "other", label: "Other" },
] as const;

interface Props {
  agentName: string;
  agentSlug: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReportAgentModal({ agentName, agentSlug, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Please select a reason.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/agents/${agentSlug}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to submit report.");
        return;
      }
      setDone(true);
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-xl max-w-sm" onClick={(e) => e.stopPropagation()}>
          <p className="text-emerald-400 font-medium">Report submitted</p>
          <p className="mt-1 text-sm text-slate-400">Thank you. We’ll review it shortly.</p>
          <button type="button" onClick={onClose} className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Report agent</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-4">Report &quot;{agentName}&quot; for review. This is not visible to the creator.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="report-reason" className="block text-xs font-medium text-slate-500 mb-1">Reason</label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              required
            >
              <option value="">Select…</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-details" className="block text-xs font-medium text-slate-500 mb-1">Details (optional)</label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Any additional context…"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rounded-lg bg-red-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
              {loading ? "Sending…" : "Submit report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

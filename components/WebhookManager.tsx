"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Globe, AlertCircle, CheckCircle2, Loader } from "lucide-react";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string;
  created_at: string;
  last_fired_at: string | null;
  failure_count: number;
}

const EVENT_OPTIONS = [
  { value: "task.completed", label: "Task Completed", color: "emerald" },
  { value: "task.failed",    label: "Task Failed",    color: "red" },
  { value: "task.started",   label: "Task Started",   color: "sky" },
  { value: "task.cancelled", label: "Task Cancelled", color: "slate" },
];

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [url, setUrl]           = useState("");
  const [events, setEvents]     = useState(["task.completed", "task.failed"]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/webhooks/manage");
    const data = await res.json();
    setWebhooks(data.webhooks ?? []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!url.startsWith("https://")) {
      setError("URL must start with https://");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/webhooks/manage", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ url, events }),
    });
    if (res.ok) {
      setAdding(false);
      setUrl("");
      setEvents(["task.completed", "task.failed"]);
      load();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to add webhook");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this webhook?")) return;
    await fetch(`/api/webhooks/manage?id=${id}`, { method: "DELETE" });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleToggle(wh: Webhook) {
    await fetch(`/api/webhooks/manage?id=${wh.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ is_active: !wh.is_active }),
    });
    setWebhooks((prev) => prev.map((w) => w.id === wh.id ? { ...w, is_active: !w.is_active } : w));
  }

  function toggleEvent(e: string) {
    setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Webhooks</h3>
          <p className="text-xs text-slate-500 mt-0.5">Get notified when tasks complete in your app</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add webhook
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border border-indigo-500/30 bg-slate-900/80 p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Endpoint URL (HTTPS required)</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <Globe className="h-4 w-4 text-slate-500 shrink-0" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourapp.com/webhooks/agents-dev"
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-2 block">Subscribe to events</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_OPTIONS.map((ev) => (
                <button
                  key={ev.value}
                  onClick={() => toggleEvent(ev.value)}
                  className={`rounded-lg border px-3 py-1 text-xs transition ${
                    events.includes(ev.value)
                      ? "border-indigo-500 bg-indigo-900/40 text-indigo-300"
                      : "border-slate-700 bg-slate-800/60 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-medium text-white transition"
            >
              {saving ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              onClick={() => { setAdding(false); setError(""); }}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="h-5 w-5 animate-spin text-slate-600" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center">
          <Globe className="mx-auto h-8 w-8 text-slate-700 mb-2" />
          <p className="text-xs text-slate-500">No webhooks yet.</p>
          <p className="text-xs text-slate-600 mt-0.5">Add one to get notified when your tasks complete.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className={`rounded-xl border p-4 space-y-2 transition ${
                wh.is_active
                  ? "border-slate-800 bg-slate-900/60"
                  : "border-slate-800/50 bg-slate-950/60 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate font-mono">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {wh.events.map((e) => (
                      <span key={e} className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleToggle(wh)} title={wh.is_active ? "Disable" : "Enable"}>
                    {wh.is_active
                      ? <ToggleRight className="h-5 w-5 text-indigo-400 hover:text-indigo-300" />
                      : <ToggleLeft  className="h-5 w-5 text-slate-600 hover:text-slate-400" />
                    }
                  </button>
                  <button onClick={() => handleDelete(wh.id)} title="Delete">
                    <Trash2 className="h-4 w-4 text-slate-600 hover:text-red-400 transition" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-600">
                <span>Secret: <code className="text-slate-500">{wh.secret}</code></span>
                {wh.last_fired_at && (
                  <span>Last fired: {new Date(wh.last_fired_at).toLocaleString()}</span>
                )}
                {wh.failure_count > 0 && (
                  <span className="text-red-500">⚠ {wh.failure_count} failures</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HMAC verification tip */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-400">Verify requests in your app:</p>
        <code className="block text-slate-500 bg-slate-950 rounded p-2 mt-1 text-[11px]">
          {`const sig = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');`}<br />
          {`if ('sha256=' + sig !== req.headers['x-agents-dev-sig']) throw 'Invalid';`}
        </code>
      </div>
    </div>
  );
}

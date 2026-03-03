"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used: string | null;
  created_at: string;
  expires_at: string | null;
}

interface Props {
  keys: ApiKey[];
}

export default function ApiKeysManager({ keys: initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const router = useRouter();

  async function createKey() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewKey(data.key);
      setKeys((prev) => [data.meta, ...prev]);
      setName("");
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    setRevoking(id);
    try {
      await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      router.refresh();
    } finally {
      setRevoking(null);
    }
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* New key banner */}
      {newKey && (
        <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/30 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 text-lg">✓</span>
            <div>
              <p className="text-sm font-medium text-emerald-300">API key created!</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Copy this key now — it won&apos;t be shown again.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <code className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-300 truncate">
              {newKey}
            </code>
            <button
              onClick={() => copyKey(newKey)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                copied
                  ? "border-emerald-700 bg-emerald-900/40 text-emerald-400"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            I&apos;ve saved it, dismiss →
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-200">New API key</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createKey()}
            placeholder="Key name (e.g. Production, My App)"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
          />
          <div className="flex gap-2">
            <button
              onClick={createKey}
              disabled={creating || !name.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create key"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-400 transition hover:border-indigo-500/50 hover:text-slate-200 w-full"
        >
          <span className="text-lg leading-none">+</span>
          Create new API key
        </button>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-500">No API keys yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{key.name}</p>
                <div className="flex flex-wrap gap-3 mt-0.5 text-[11px] text-slate-500">
                  <code className="font-mono text-slate-400">{key.key_prefix}••••••••</code>
                  <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                  {key.last_used && (
                    <span>Last used {new Date(key.last_used).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => revokeKey(key.id)}
                disabled={revoking === key.id}
                className="shrink-0 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:border-red-700 hover:bg-red-900/40 disabled:opacity-50"
              >
                {revoking === key.id ? "Revoking…" : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

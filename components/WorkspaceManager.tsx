"use client";

import { useState } from "react";
import { Users, Plus, Trash2, Mail, Copy, Check, Loader, Building2 } from "lucide-react";

interface Workspace { id: string; name: string; balance: number; slug: string; created_at: string }
interface MemberWs   { id: string; name: string; balance: number; role: string }

interface Props {
  owned:    Workspace[];
  memberOf: MemberWs[];
  userId:   string;
}

export default function WorkspaceManager({ owned, memberOf, userId }: Props) {
  const [workspaces, setWorkspaces] = useState(owned);
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [saving, setSaving]         = useState(false);
  const [activeWs, setActiveWs]     = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviting, setInviting]     = useState(false);
  const [copied, setCopied]         = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      const { workspace } = await res.json();
      setWorkspaces((prev) => [...prev, workspace]);
      setCreating(false);
      setNewName("");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete workspace? All members will lose access.")) return;
    await fetch(`/api/workspaces?id=${id}`, { method: "DELETE" });
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleInvite(workspaceId: string) {
    if (!inviteEmail.includes("@")) return;
    setInviting(true);
    const res = await fetch("/api/workspaces/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, email: inviteEmail }),
    });
    if (res.ok) {
      const { inviteUrl } = await res.json();
      setInviteLink(inviteUrl);
      setInviteEmail("");
    }
    setInviting(false);
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Owned workspaces */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-400" />
            My Workspaces
          </h2>
          {!creating && workspaces.length < 3 && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition"
            >
              <Plus className="h-3.5 w-3.5" /> New workspace
            </button>
          )}
        </div>

        {creating && (
          <div className="rounded-xl border border-indigo-500/30 bg-slate-900/80 p-4 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Workspace name (e.g. Acme Corp)"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500"
              autoFocus
            />
            <button onClick={handleCreate} disabled={saving} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-medium text-white transition">
              {saving ? <Loader className="h-3.5 w-3.5 animate-spin" /> : "Create"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition" aria-label="Cancel">✕</button>
          </div>
        )}

        {workspaces.length === 0 && !creating ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-700 mb-2" />
            <p className="text-xs text-slate-500">No workspaces yet.</p>
            <p className="text-xs text-slate-600 mt-0.5">Create one to share credits with your team.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workspaces.map((ws) => (
              <div key={ws.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-100">{ws.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ⚡ {ws.balance.toLocaleString()} credits · Owner
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveWs(activeWs === ws.id ? null : ws.id)}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
                    >
                      <Mail className="h-3 w-3" /> Invite
                    </button>
                    <button type="button" onClick={() => handleDelete(ws.id)} className="rounded-lg border border-slate-800 p-1.5 text-slate-600 hover:text-red-400 transition" aria-label={`Delete workspace ${ws.name}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Invite panel */}
                {activeWs === ws.id && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                    <p className="text-xs font-medium text-slate-400">Invite team member</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleInvite(ws.id)}
                        disabled={inviting || !inviteEmail.includes("@")}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 text-xs text-white transition"
                      >
                        {inviting ? <Loader className="h-3 w-3 animate-spin" /> : "Send"}
                      </button>
                    </div>
                    {inviteLink && (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-3 py-2">
                        <p className="flex-1 text-[10px] text-emerald-400 font-mono truncate">{inviteLink}</p>
                        <button type="button" onClick={copyLink} className="shrink-0 text-emerald-400 hover:text-emerald-300" aria-label={copied ? "Copied" : "Copy invite link"}>
                          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-600">
                      Share the link or send to their email. Expires in 7 days.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member of workspaces */}
      {memberOf.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            Member of
          </h2>
          <div className="space-y-2">
            {memberOf.map((ws) => (
              <div key={ws.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">{ws.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">⚡ {ws.balance.toLocaleString()} credits · {ws.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-400">How workspaces work</p>
        <ul className="space-y-1 mt-1 list-disc list-inside">
          <li>Shared credits pool — team members use the workspace balance</li>
          <li>Up to 10 members per workspace, 3 workspaces per account</li>
          <li>Owner controls the balance and can top up from the billing page</li>
          <li>All tasks and results are visible to workspace members</li>
        </ul>
      </div>
    </div>
  );
}

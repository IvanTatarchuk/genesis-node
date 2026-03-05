/**
 * /data — Your Data page
 * Shows all user data stored on the platform with GDPR-compliant export & delete
 */
import type { Metadata } from "next";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, Shield, Database, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Your Data — AGENTS.DEV",
  description: "View, export, or delete all your personal data stored on AGENTS.DEV.",
};

export default async function DataPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/data");

  const service = createServiceClient();

  const [
    { count: taskCount },
    { count: agentCount },
    { count: txnCount },
    profileRes,
  ] = await Promise.all([
    service.from("tasks").select("id", { count: "exact", head: true }).eq("client_id", user.id),
    service.from("agents").select("id", { count: "exact", head: true }).eq("developer_id", user.id),
    service.from("credit_transactions").select("id", { count: "exact", head: true }).eq("profile_id", user.id),
    service.from("profiles").select("display_name, created_at, subscription_tier").eq("id", user.id).single(),
  ]);

  const profile = profileRes.data as { display_name: string; created_at: string; subscription_tier: string } | null;
  const DATA_CATEGORIES = [
    { icon: "👤", label: "Profile & Account", desc: "Name, email, avatar, subscription", count: 1 },
    { icon: "⚡", label: "Tasks", desc: "Goals, results, status, credits charged", count: taskCount ?? 0 },
    { icon: "🤖", label: "Published Agents", desc: "Agent configs, pricing, descriptions", count: agentCount ?? 0 },
    { icon: "💳", label: "Credit Transactions", desc: "Top-ups, task charges, refunds", count: txnCount ?? 0 },
    { icon: "🪙", label: "MATADORA Wallet", desc: "Balance, earn/spend history", count: 1 },
    { icon: "🔑", label: "API Keys", desc: "Key metadata (not the keys themselves)", count: null },
    { icon: "📅", label: "Scheduled Tasks", desc: "Recurring task configurations", count: null },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">← Dashboard</Link>
          <h1 className="text-sm font-semibold text-slate-200">Your Data</h1>
          <span />
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Shield className="h-5 w-5" />
            <h1 className="text-2xl font-bold text-white">Your Data on AGENTS.DEV</h1>
          </div>
          <p className="text-slate-400 text-sm">
            All data stored on our servers — transparent and under your control. 
            You can export or delete everything at any time.
          </p>
        </div>

        {/* Account summary */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Database className="h-4 w-4" /> Account
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Email</p>
              <p className="text-slate-200 font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Display name</p>
              <p className="text-slate-200 font-medium">{profile?.display_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Account created</p>
              <p className="text-slate-200 font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Subscription</p>
              <p className="text-slate-200 font-medium capitalize">{profile?.subscription_tier ?? "free"}</p>
            </div>
          </div>
        </div>

        {/* Data categories */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">What we store</h2>
          <div className="space-y-2">
            {DATA_CATEGORIES.map(({ icon, label, desc, count }) => (
              <div key={label} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <span className="text-2xl">{icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-200 text-sm">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                {count !== null && (
                  <span className="text-xs text-slate-500 font-medium">{count.toLocaleString()} records</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold text-white">Export Your Data</h2>
          </div>
          <p className="text-sm text-slate-400">
            Download a complete JSON export of everything we have stored about you — 
            tasks, agents, transactions, MATADORA wallet, API key metadata, and more.
          </p>
          <a
            href="/api/data/export"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition"
          >
            <Download className="h-4 w-4" />
            Download my data (JSON)
          </a>
          <p className="text-xs text-slate-600">Limited to 3 exports per hour.</p>
        </div>

        {/* Delete */}
        <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-400" />
            <h2 className="font-semibold text-white">Delete Account</h2>
          </div>
          <p className="text-sm text-slate-400">
            Permanently delete your account and all associated data. This action cannot be undone.
            Any active agent subscriptions will be cancelled. Published agents will be deactivated.
          </p>
          <p className="text-xs text-slate-500">
            To request account deletion, contact us at{" "}
            <a href="mailto:delete@agents.dev" className="text-red-400 hover:underline">delete@agents.dev</a>{" "}
            from your registered email address.
          </p>
        </div>

        {/* Privacy note */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-400">Privacy & Security</p>
          <p>All data is stored in Supabase (PostgreSQL) with Row Level Security. Only you can access your data.</p>
          <p>Task results are stored encrypted at rest. API keys are hashed (we never see your full key).</p>
          <p>We do not sell your data to third parties.</p>
        </div>
      </main>
    </div>
  );
}

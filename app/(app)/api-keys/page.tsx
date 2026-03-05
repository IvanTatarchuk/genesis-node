import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/database.types";
import ApiKeysManager from "@/components/ApiKeysManager";
import WebhookManager from "@/components/WebhookManager";

export default async function ApiKeysPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();
  const profileRes = await service.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileRes.data as unknown as Profile;

  const tier = (profile as unknown as { subscription_tier?: string })?.subscription_tier ?? "free";
  const hasAccess = ["pro", "agency"].includes(tier);

  const { data: keys } = await service
    .from("api_keys")
    .select("id, name, key_prefix, last_used, created_at, expires_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">API Keys</h1>
        <p className="mt-1 text-sm text-slate-400">
          Use API keys to deploy agents programmatically from your own code.
        </p>
      </div>

      {!hasAccess ? (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-8 text-center space-y-4">
          <p className="text-4xl">🔑</p>
          <p className="text-lg font-semibold text-slate-100">API Access requires Pro or Agency plan</p>
          <p className="text-sm text-slate-400">
            Upgrade to get API keys and integrate Genesis Node agents into your own apps and workflows.
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
          >
            Upgrade to Pro →
          </a>
        </div>
      ) : (
        <ApiKeysManager keys={keys ?? []} />
      )}

      {/* Webhooks — available for all devs */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <WebhookManager />
      </div>

      {/* Docs */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <p className="text-sm font-semibold text-slate-200">Quick start</p>
        <pre className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs text-slate-400 overflow-x-auto"><code>{`# Deploy an agent via API
curl -X POST https://agents-dev-roan.vercel.app/api/v1/tasks \\
  -H "Authorization: Bearer gn_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_slug": "web-researcher",
    "goal": "Research top 5 competitors of Notion"
  }'`}</code></pre>
        <p className="text-xs text-slate-500">
          The response includes a <code className="text-slate-300">task_id</code> you can use to stream logs or get results.
        </p>
      </div>
    </main>
  );
}

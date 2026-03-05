import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import WorkspaceManager from "@/components/WorkspaceManager";

export default async function WorkspacePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();

  // Owned workspaces
  const { data: owned } = await service
    .from("workspaces")
    .select("id, name, balance, slug, created_at")
    .eq("owner_id", user.id);

  // Member workspaces
  const { data: memberOf } = await service
    .from("workspace_members")
    .select("role, workspaces ( id, name, balance )")
    .eq("profile_id", user.id)
    .neq("role", "owner");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Team Workspaces</h1>
        <p className="mt-1 text-sm text-slate-400">
          Share credits with your team. Everyone can deploy agents from a shared balance.
        </p>
      </div>
      <WorkspaceManager
        owned={(owned ?? []) as Array<{ id: string; name: string; balance: number; slug: string; created_at: string }>}
        memberOf={(memberOf ?? []).map((m) => {
          const ws = m.workspaces as unknown as { id: string; name: string; balance: number };
          return { ...ws, role: m.role as string };
        })}
        userId={user.id}
      />
    </main>
  );
}

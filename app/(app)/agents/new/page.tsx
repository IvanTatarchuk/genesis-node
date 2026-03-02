import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/database.types";
import RegisterAgentForm from "@/components/RegisterAgentForm";

export default async function NewAgentPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/agents/new");

  const profileRes = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileRes.data as unknown as Profile | null;

  if (profile?.role !== "dev") {
    redirect("/dashboard?error=not_a_dev");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-100">Register a new agent</h1>
        <p className="mt-2 text-sm text-slate-400">
          Fill in the details below. Your agent will appear in the marketplace once published.
        </p>
      </div>
      <RegisterAgentForm creatorId={user.id} />
    </main>
  );
}

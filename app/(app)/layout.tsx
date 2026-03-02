import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/database.types";
import Navbar from "@/components/ui/Navbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const res = await supabase.from("profiles").select("*").eq("id", user.id).single();
    profile = res.data as unknown as Profile | null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar profile={profile} />
      {children}
    </div>
  );
}

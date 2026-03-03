import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/database.types";
import Navbar from "@/components/ui/Navbar";
import OnboardingWizard from "@/components/OnboardingWizard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const res = await supabase.from("profiles").select("*").eq("id", user.id).single();
    profile = res.data as unknown as Profile | null;
  }

  const needsOnboarding = profile && !(profile as any).onboarding_done;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar profile={profile} />
      {needsOnboarding && <OnboardingWizard userId={profile!.id} />}
      {children}
    </div>
  );
}

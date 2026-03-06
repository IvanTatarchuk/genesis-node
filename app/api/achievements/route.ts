import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const [{ data: all }, { data: unlocked }] = await Promise.all([
    service.from("achievements").select("*"),
    service.from("user_achievements").select("*").eq("profile_id", user.id),
  ]);

  const unlockedKeys = new Set((unlocked ?? []).map((u: { achievement_key: string }) => u.achievement_key));
  const unlockedMap  = new Map((unlocked ?? []).map((u: { achievement_key: string; unlocked_at: string }) => [u.achievement_key, u.unlocked_at]));

  const achievements = (all ?? []).map((a: { key: string }) => ({
    ...a,
    unlocked:    unlockedKeys.has(a.key),
    unlocked_at: unlockedMap.get(a.key) ?? null,
  }));

  return NextResponse.json({ achievements });
}

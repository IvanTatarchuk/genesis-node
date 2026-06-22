import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

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

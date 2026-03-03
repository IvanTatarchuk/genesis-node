import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import crypto from "crypto";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 422 });

  const service = createServiceClient();

  // Check tier
  const { data: profile } = await service.from("profiles").select("subscription_tier").eq("id", user.id).single();
  const tier = (profile as unknown as { subscription_tier?: string })?.subscription_tier ?? "free";
  if (!["pro", "agency"].includes(tier)) {
    return NextResponse.json({ error: "API access requires Pro or Agency plan" }, { status: 403 });
  }

  // Limit keys
  const { count } = await service.from("api_keys").select("*", { count: "exact", head: true }).eq("profile_id", user.id);
  const maxKeys = tier === "agency" ? 20 : 5;
  if ((count ?? 0) >= maxKeys) {
    return NextResponse.json({ error: `Maximum ${maxKeys} API keys allowed on your plan` }, { status: 422 });
  }

  // Generate key: gn_live_<32 random chars>
  const rawKey = `gn_live_${crypto.randomBytes(24).toString("base64url")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12) + "...";

  const { data: meta, error } = await service.from("api_keys").insert({
    profile_id: user.id,
    name: name.trim(),
    key_hash:   keyHash,
    key_prefix: keyPrefix,
  }).select("id, name, key_prefix, last_used, created_at, expires_at").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ key: rawKey, meta });
}

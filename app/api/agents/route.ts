import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/database.types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only developers can register agents
  const profileRes = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileRes.data as unknown as Profile | null;

  if (profile?.role !== "dev") {
    return NextResponse.json(
      { error: "Only developer accounts can register agents. Switch your role in Dashboard." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    name, slug, description, long_description,
    config_blob, price_per_task, tags,
  } = body as {
    name:             string;
    slug:             string;
    description:      string;
    long_description: string | null;
    config_blob:      Record<string, unknown>;
    price_per_task:   number;
    tags:             string[];
  };

  // Validate required fields
  if (!name?.trim() || !slug?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "name, slug and description are required" }, { status: 422 });
  }

  // Enforce slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Slug may only contain lowercase letters, numbers, and hyphens." }, { status: 422 });
  }

  if (price_per_task < 10) {
    return NextResponse.json({ error: "Minimum price is 10 credits." }, { status: 422 });
  }

  const service = createServiceClient();

  const { data: agent, error } = await service
    .from("agents")
    .insert({
      creator_id:       user.id,
      name:             name.trim(),
      slug:             slug.trim(),
      description:      description.trim(),
      long_description: long_description ?? null,
      config_blob:      config_blob ?? {},
      price_per_task,
      tags:             tags ?? [],
      is_active:        true,
    })
    .select("id, name, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "An agent with this slug already exists. Choose a different slug." }, { status: 409 });
    }
    console.error("[POST /api/agents]", error);
    return NextResponse.json({ error: "Failed to create agent." }, { status: 500 });
  }

  return NextResponse.json({ agent }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role?: string } | null)?.role !== "dev") {
    return NextResponse.json({ error: "Only developers can create pipelines" }, { status: 403 });
  }

  const body = await req.json();
  const { name, slug, description, steps, price_per_run, tags, category_slug } = body as {
    name:          string;
    slug:          string;
    description:   string;
    steps:         Array<{ agent_id: string; agent_name: string; description: string }>;
    price_per_run: number;
    tags:          string[];
    category_slug: string | null;
  };

  if (!name?.trim() || !slug?.trim())
    return NextResponse.json({ error: "name and slug are required" }, { status: 422 });
  if (!steps || steps.length < 2)
    return NextResponse.json({ error: "A pipeline needs at least 2 agents" }, { status: 422 });
  if (steps.length > 8)
    return NextResponse.json({ error: "Maximum 8 steps per pipeline" }, { status: 422 });
  if (price_per_run < 10)
    return NextResponse.json({ error: "Minimum price is 10 credits" }, { status: 422 });

  const service = createServiceClient();

  // Verify all agent IDs exist and are active
  const agentIds = steps.map((s) => s.agent_id);
  const { data: agents } = await service
    .from("agents").select("id, name").in("id", agentIds).eq("is_active", true);
  if ((agents ?? []).length !== agentIds.length) {
    return NextResponse.json({ error: "One or more agents not found or inactive" }, { status: 422 });
  }

  // Enrich steps with order index
  const enrichedSteps = steps.map((s, i) => ({ ...s, order: i }));

  const { data: pipeline, error } = await service
    .from("pipelines")
    .insert({
      creator_id:    user.id,
      name:          name.trim(),
      slug:          slug.trim(),
      description:   description?.trim() ?? null,
      steps:         enrichedSteps,
      price_per_run,
      tags:          tags ?? [],
      category_slug: category_slug ?? null,
      is_active:     true,
    })
    .select("id, name, slug")
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "A pipeline with this slug already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pipeline }, { status: 201 });
}

import { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase-server";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agents-dev.vercel.app";

export const revalidate = 3600; // Re-generate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();

  // Fetch all active agent slugs
  const { data: agents } = await supabase
    .from("agents")
    .select("slug, updated_at")
    .eq("is_active", true)
    .order("total_tasks_completed", { ascending: false });

  // Fetch all dev profile IDs for public dev pages
  const { data: devs } = await supabase
    .from("profiles")
    .select("id, updated_at")
    .eq("role", "dev")
    .limit(500);

  const agentPages: MetadataRoute.Sitemap = (agents ?? []).map((a) => ({
    url:             `${BASE_URL}/agents/${a.slug}`,
    lastModified:    new Date(a.updated_at ?? Date.now()),
    changeFrequency: "daily",
    priority:        0.8,
  }));

  const devPages: MetadataRoute.Sitemap = (devs ?? []).map((d) => ({
    url:             `${BASE_URL}/dev/${d.id}`,
    lastModified:    new Date(d.updated_at ?? Date.now()),
    changeFrequency: "weekly",
    priority:        0.5,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                  changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/marketplace`,       changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE_URL}/templates`,         changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE_URL}/gallery`,           changeFrequency: "hourly",  priority: 0.8 },
    { url: `${BASE_URL}/pricing`,           changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/leaderboard`,       changeFrequency: "daily",   priority: 0.7 },
    { url: `${BASE_URL}/become-developer`,  changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/integrations`,      changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/growth-factory`,     changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/b2b-leads`,          changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/login`,             changeFrequency: "monthly", priority: 0.4 },
  ];

  return [...staticPages, ...agentPages, ...devPages];
}

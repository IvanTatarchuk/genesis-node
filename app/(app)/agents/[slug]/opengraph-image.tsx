import { ImageResponse } from "next/og";
import { createServiceClient } from "@/lib/supabase-server";

export const runtime = "edge";
export const alt = "Agent on AGENTS.DEV";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AgentOGImage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("name, description, price_per_task, total_tasks_completed, avg_rating, tags, category_slug")
    .eq("slug", slug)
    .single();

  const name        = agent?.name        ?? "AI Agent";
  const description = agent?.description ?? "Autonomous AI agent on AGENTS.DEV";
  const price       = agent?.price_per_task ?? 0;
  const tasks       = agent?.total_tasks_completed ?? 0;
  const rating      = agent?.avg_rating ? Number(agent.avg_rating).toFixed(1) : null;
  const tags        = (agent?.tags ?? []).slice(0, 3) as string[];

  const shortDesc = description.length > 100
    ? description.slice(0, 97) + "..."
    : description;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            background: "linear-gradient(135deg, #6366f1, #22d3ee)",
            borderRadius: "12px",
            padding: "8px 18px",
            color: "white",
            fontSize: "16px",
            fontWeight: "700",
            letterSpacing: "-0.5px",
          }}>
            AGENTS.DEV
          </div>
          <div style={{ color: "#475569", fontSize: "15px" }}>AI Agent Marketplace</div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Agent icon + name */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #6366f1, #22d3ee)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
            }}>
              🤖
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ color: "white", fontSize: "48px", fontWeight: "800", letterSpacing: "-1px", lineHeight: 1 }}>
                {name}
              </div>
              {rating && (
                <div style={{ color: "#fbbf24", fontSize: "20px" }}>
                  ★ {rating} rating
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div style={{ color: "#94a3b8", fontSize: "22px", lineHeight: 1.5, maxWidth: "900px" }}>
            {shortDesc}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: "10px" }}>
              {tags.map((tag) => (
                <div key={tag} style={{
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.4)",
                  borderRadius: "8px",
                  padding: "4px 14px",
                  color: "#a5b4fc",
                  fontSize: "16px",
                }}>
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom stats bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(99,102,241,0.2)",
          paddingTop: "24px",
        }}>
          <div style={{ display: "flex", gap: "40px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ color: "#6366f1", fontSize: "28px", fontWeight: "700" }}>⚡ {price}</div>
              <div style={{ color: "#475569", fontSize: "14px" }}>credits per task</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ color: "#22d3ee", fontSize: "28px", fontWeight: "700" }}>{tasks.toLocaleString()}</div>
              <div style={{ color: "#475569", fontSize: "14px" }}>tasks completed</div>
            </div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #6366f1, #22d3ee)",
            borderRadius: "12px",
            padding: "14px 28px",
            color: "#0f172a",
            fontSize: "18px",
            fontWeight: "700",
          }}>
            Deploy now →
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

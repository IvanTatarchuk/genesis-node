import { ImageResponse } from "next/og";
import { createServiceClient } from "@/lib/supabase-server";

export const runtime = "edge";
export const alt = "AGENTS.DEV – AI Agent Marketplace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function DefaultOGImage() {
  const supabase = createServiceClient();

  // Live stats for the OG image
  const [{ count: agentCount }, { count: taskCount }] = await Promise.all([
    supabase.from("agents").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "completed"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)",
          fontFamily: "sans-serif",
          gap: "32px",
          padding: "60px",
        }}
      >
        {/* Logo */}
        <div style={{
          background: "linear-gradient(135deg, #6366f1, #22d3ee)",
          borderRadius: "20px",
          padding: "14px 32px",
          color: "white",
          fontSize: "28px",
          fontWeight: "900",
          letterSpacing: "-1px",
        }}>
          AGENTS.DEV
        </div>

        {/* Headline */}
        <div style={{
          color: "white",
          fontSize: "64px",
          fontWeight: "900",
          letterSpacing: "-2px",
          textAlign: "center",
          lineHeight: 1.1,
          maxWidth: "900px",
        }}>
          AI Agent Marketplace
        </div>

        {/* Sub */}
        <div style={{
          color: "#94a3b8",
          fontSize: "26px",
          textAlign: "center",
          maxWidth: "800px",
          lineHeight: 1.4,
        }}>
          Deploy autonomous AI agents to complete any task. Pay per result.
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "60px", marginTop: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div style={{ color: "#6366f1", fontSize: "42px", fontWeight: "800" }}>{agentCount ?? 0}+</div>
            <div style={{ color: "#475569", fontSize: "16px" }}>Active Agents</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div style={{ color: "#22d3ee", fontSize: "42px", fontWeight: "800" }}>{(taskCount ?? 0).toLocaleString()}+</div>
            <div style={{ color: "#475569", fontSize: "16px" }}>Tasks Completed</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div style={{ color: "#34d399", fontSize: "42px", fontWeight: "800" }}>70%</div>
            <div style={{ color: "#475569", fontSize: "16px" }}>Dev Revenue Share</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

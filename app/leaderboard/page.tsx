import Link from "next/link";
import type { CSSProperties } from "react";

import { sumRangeChallenge } from "@/challenges/sum-range";
import { fetchLeaderboard } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  let rows: Awaited<ReturnType<typeof fetchLeaderboard>> = [];
  let error: string | null = null;

  try {
    rows = await fetchLeaderboard(sumRangeChallenge.id);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Leaderboard — {sumRangeChallenge.title}</h1>
      <p>
        <Link href="/">Back</Link>
      </p>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!error && rows.length === 0 && <p>No passing runs yet.</p>}

      {!error && rows.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cellStyle}>#</th>
              <th style={cellStyle}>Player</th>
              <th style={cellStyle}>Model</th>
              <th style={cellStyle}>Time</th>
              <th style={cellStyle}>Attempts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.player_name}-${row.created_at}`}>
                <td style={cellStyle}>{i + 1}</td>
                <td style={cellStyle}>{row.player_name}</td>
                <td style={cellStyle}>{row.model}</td>
                <td style={cellStyle}>{row.duration_ms}ms</td>
                <td style={cellStyle}>{row.iterations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const cellStyle: CSSProperties = {
  border: "1px solid #ddd",
  padding: "0.5rem",
  textAlign: "left",
};

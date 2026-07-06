import Link from "next/link";
import type { CSSProperties } from "react";

import { challengeList, getChallenge } from "@/challenges";
import { cosmetics } from "@/lib/cosmetics";
import { fetchLeaderboard } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface LeaderboardPageProps {
  searchParams: Promise<{ challenge?: string }>;
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const { challenge: challengeIdParam } = await searchParams;
  const challengeId = challengeIdParam ?? challengeList[0]!.id;

  let challenge;
  try {
    challenge = getChallenge(challengeId);
  } catch {
    challenge = challengeList[0]!;
  }

  let rows: Awaited<ReturnType<typeof fetchLeaderboard>> = [];
  let error: string | null = null;

  try {
    rows = await fetchLeaderboard(challenge.id);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Leaderboard</h1>
      <p>
        <Link href="/">Back</Link> · <Link href="/shop">Shop</Link>
      </p>

      <nav style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {challengeList.map((c) => (
          <Link
            key={c.id}
            href={`/leaderboard?challenge=${c.id}`}
            style={{ fontWeight: c.id === challenge.id ? "bold" : "normal" }}
          >
            {c.title}
          </Link>
        ))}
      </nav>

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
            {rows.map((row, i) => {
              const badge = row.active_cosmetic_id ? cosmetics[row.active_cosmetic_id] : undefined;
              return (
                <tr key={`${row.player_name}-${row.created_at}`}>
                  <td style={cellStyle}>{i + 1}</td>
                  <td style={cellStyle}>
                    {row.player_name}
                    {badge && (
                      <span style={{ marginLeft: "0.4rem" }} title={badge.name}>
                        {badge.name}
                      </span>
                    )}
                  </td>
                  <td style={cellStyle}>{row.model}</td>
                  <td style={cellStyle}>{row.duration_ms}ms</td>
                  <td style={cellStyle}>{row.iterations}</td>
                </tr>
              );
            })}
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

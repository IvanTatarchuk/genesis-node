import Link from "next/link";
import type { CSSProperties } from "react";

import { listChallengeMetadata } from "@/lib/challengeSource";
import { modelLabel } from "@/lib/loadouts";
import { computeRatings, rank } from "@/lib/rating";
import { fetchAllRuns } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * The benchmark's headline surface: Elo ratings for models and self-calibrating
 * difficulty for challenges, computed from the public run history
 * (`lib/rating.ts`). Deterministic and reproducible — anyone with the same runs
 * recomputes the same numbers — which is the whole point of a citable rating.
 * Degrades like the leaderboard when Supabase isn't configured.
 */
export default async function RatingsPage() {
  let error: string | null = null;
  let modelRows: Array<[string, number]> = [];
  let challengeRows: Array<[string, number]> = [];
  let runCount = 0;
  const challengeTitles: Record<string, string> = {};

  try {
    const [runs, challenges] = await Promise.all([fetchAllRuns(), listChallengeMetadata()]);
    for (const c of challenges) challengeTitles[c.id] = c.title;

    runCount = runs.length;
    const ratings = computeRatings(
      runs.map((r) => ({ model: r.model, challengeId: r.challenge_id, passed: r.passed }))
    );
    modelRows = rank(ratings.models);
    challengeRows = rank(ratings.challenges);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Ratings</h1>
      <p>
        <Link href="/">Home</Link> · <Link href="/leaderboard">Leaderboard</Link>
      </p>
      <p style={{ color: "#555" }}>
        Elo ratings computed from the public run history — every run is a game between the model and
        the challenge. Reproducible from the same runs, so the numbers are checkable, not decreed.
      </p>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!error && runCount === 0 && <p>No runs yet — play a challenge to seed the ratings.</p>}

      {!error && runCount > 0 && (
        <>
          <p style={{ color: "#888" }}>Computed from {runCount} runs.</p>

          <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Models</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={cellStyle}>#</th>
                <th style={cellStyle}>Model</th>
                <th style={cellStyle}>Rating</th>
              </tr>
            </thead>
            <tbody>
              {modelRows.map(([id, rating], i) => (
                <tr key={id}>
                  <td style={cellStyle}>{i + 1}</td>
                  <td style={cellStyle} title={id}>
                    {modelLabel(id)}
                  </td>
                  <td style={cellStyle}>{Math.round(rating)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>
            Challenge difficulty <span style={{ color: "#888", fontWeight: "normal" }}>(higher = harder)</span>
          </h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={cellStyle}>#</th>
                <th style={cellStyle}>Challenge</th>
                <th style={cellStyle}>Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {challengeRows.map(([id, rating], i) => (
                <tr key={id}>
                  <td style={cellStyle}>{i + 1}</td>
                  <td style={cellStyle}>{challengeTitles[id] ?? id}</td>
                  <td style={cellStyle}>{Math.round(rating)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}

const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse" };
const cellStyle: CSSProperties = {
  border: "1px solid #ddd",
  padding: "0.5rem",
  textAlign: "left",
};

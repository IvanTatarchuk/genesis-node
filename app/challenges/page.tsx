import Link from "next/link";
import type { CSSProperties } from "react";

import { listChallengeMetadata, type ChallengeMeta } from "@/lib/challengeSource";

export const dynamic = "force-dynamic";

/**
 * Browseable catalog of every challenge, grouped by category so the security
 * set is a first-class section as it grows. Read-only reference — you play from
 * the home page; each card links to that challenge's leaderboard. Built-ins
 * always show (listChallengeMetadata falls back to them when Supabase isn't
 * configured); approved player-authored challenges join them when it is.
 */
export default async function ChallengesCatalogPage() {
  const all = await listChallengeMetadata();
  const security = all.filter((c) => c.category === "security");
  const correctness = all.filter((c) => c.category !== "security");

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Challenges</h1>
      <p>
        <Link href="/">Home</Link> · <Link href="/leaderboard">Leaderboard</Link> ·{" "}
        <Link href="/ratings">Ratings</Link> · <Link href="/challenges/submit">Submit a challenge</Link>
      </p>

      <Section
        title="🛡️ Security"
        blurb="Fix the vulnerability, not just the test — graded by an objective sandboxed check that the exploit is closed."
        challenges={security}
      />
      <Section
        title="Correctness"
        blurb="Classic bugs: make the failing test pass."
        challenges={correctness}
      />
    </main>
  );
}

function Section({
  title,
  blurb,
  challenges,
}: {
  title: string;
  blurb: string;
  challenges: ChallengeMeta[];
}) {
  if (challenges.length === 0) return null;
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "1.15rem", marginBottom: "0.25rem" }}>
        {title} <span style={{ color: "#888", fontWeight: "normal" }}>({challenges.length})</span>
      </h2>
      <p style={{ color: "#777", fontSize: "0.85rem", marginTop: 0 }}>{blurb}</p>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.6rem" }}>
        {challenges.map((c) => (
          <li key={c.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
              <strong>{c.title}</strong>
              <Link href={`/leaderboard?challenge=${encodeURIComponent(c.id)}`}>leaderboard →</Link>
            </div>
            {c.authorName && (
              <span style={{ color: "#888", fontSize: "0.85rem" }}>by {c.authorName}</span>
            )}
            {c.tags.length > 0 && (
              <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {c.tags.map((tag) => (
                  <span key={tag} style={tagStyle}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const cardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 4,
  padding: "0.6rem 0.75rem",
};

const tagStyle: CSSProperties = {
  background: "#f0f0f0",
  borderRadius: 3,
  padding: "0.05rem 0.4rem",
  fontSize: "0.75rem",
  color: "#555",
};

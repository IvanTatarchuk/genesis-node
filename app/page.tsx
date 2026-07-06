"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { sumRangeChallenge } from "@/challenges/sum-range";

interface RunResponse {
  result?: { passed: boolean; durationMs: number; stdout: string; stderr: string };
  iterations?: number;
  error?: string;
}

export default function HomePage() {
  const [playerName, setPlayerName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [response, setResponse] = useState<RunResponse | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("running");
    setResponse(null);

    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: sumRangeChallenge.id, playerName, apiKey }),
    });
    const body = (await res.json()) as RunResponse;

    setResponse(body);
    setStatus("done");
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Agent Arena</h1>
      <p>
        Challenge: <strong>{sumRangeChallenge.title}</strong>
      </p>
      <p style={{ whiteSpace: "pre-wrap", color: "#555" }}>{sumRangeChallenge.prompt}</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem", marginTop: "1.5rem" }}>
        <label>
          Player name
          <input
            required
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          Anthropic API key (used only for this run, never stored)
          <input
            required
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <button type="submit" disabled={status === "running"}>
          {status === "running" ? "Running..." : "Run"}
        </button>
      </form>

      {response?.error && <p style={{ color: "crimson" }}>Error: {response.error}</p>}

      {response?.result && (
        <div style={{ marginTop: "1rem" }}>
          <p>
            Result: <strong>{response.result.passed ? "PASSED" : "FAILED"}</strong> in{" "}
            {response.result.durationMs}ms ({response.iterations}{" "}
            {response.iterations === 1 ? "attempt" : "attempts"})
          </p>
          <pre style={{ background: "#f4f4f4", padding: "0.75rem", overflowX: "auto" }}>
            {response.result.stdout || response.result.stderr}
          </pre>
        </div>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link href="/leaderboard">View leaderboard</Link>
      </p>
    </main>
  );
}

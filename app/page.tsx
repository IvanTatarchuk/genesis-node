"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { challengeList } from "@/challenges";

interface LiveIteration {
  iteration: number;
  passed: boolean;
  summary: string;
  reasoning: string;
  submittedContent: string;
}

interface DonePayload {
  result: { passed: boolean; durationMs: number; stdout: string; stderr: string };
  iterations: number;
  reward: number;
  shardBalance: number | null;
}

/**
 * Reads a `text/event-stream` response body and dispatches each `event: X` /
 * `data: Y` block. Not the browser's EventSource, deliberately — EventSource
 * only supports GET, and the caller's API key belongs in a POST body, not a
 * URL (server logs, browser history).
 */
async function consumeEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: unknown) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const eventLine = rawEvent.split("\n").find((line) => line.startsWith("event: "));
      const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data: "));
      if (!eventLine || !dataLine) continue;

      onEvent(eventLine.slice("event: ".length), JSON.parse(dataLine.slice("data: ".length)));
    }
  }
}

export default function HomePage() {
  const [challengeId, setChallengeId] = useState(challengeList[0]!.id);
  const [playerName, setPlayerName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [liveIterations, setLiveIterations] = useState<LiveIteration[]>([]);
  const [done, setDone] = useState<DonePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const challenge = useMemo(
    () => challengeList.find((c) => c.id === challengeId) ?? challengeList[0]!,
    [challengeId]
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("running");
    setLiveIterations([]);
    setDone(null);
    setError(null);

    const res = await fetch("/api/runs/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, playerName, apiKey }),
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("text/event-stream") || !res.body) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `request failed (${res.status})`);
      setStatus("done");
      return;
    }

    await consumeEventStream(res.body, (event, data) => {
      if (event === "iteration") {
        setLiveIterations((prev) => [...prev, data as LiveIteration]);
      } else if (event === "done") {
        setDone(data as DonePayload);
      } else if (event === "error") {
        setError((data as { error: string }).error);
      }
    });

    setStatus("done");
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Agent Arena</h1>

      <label>
        Challenge
        <select
          value={challengeId}
          onChange={(e) => {
            setChallengeId(e.target.value);
            setLiveIterations([]);
            setDone(null);
            setError(null);
          }}
          style={{ display: "block", width: "100%", marginBottom: "0.75rem" }}
        >
          {challengeList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <p style={{ whiteSpace: "pre-wrap", color: "#555" }}>{challenge.prompt}</p>

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

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {liveIterations.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem" }}>Attempts (live)</h2>
          {liveIterations.map((it) => (
            <div
              key={it.iteration}
              style={{
                border: `1px solid ${it.passed ? "#3a3" : "#ddd"}`,
                borderRadius: 4,
                padding: "0.5rem 0.75rem",
                marginBottom: "0.5rem",
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>
                  Attempt {it.iteration}: {it.passed ? "PASSED" : "failed"}
                </strong>
              </p>
              {it.reasoning && (
                <p style={{ margin: "0.25rem 0", color: "#555", fontStyle: "italic" }}>{it.reasoning}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {done && (
        <div style={{ marginTop: "1rem" }}>
          <p>
            Final result: <strong>{done.result.passed ? "PASSED" : "FAILED"}</strong> in{" "}
            {done.result.durationMs}ms ({done.iterations} {done.iterations === 1 ? "attempt" : "attempts"})
          </p>
          <pre style={{ background: "#f4f4f4", padding: "0.75rem", overflowX: "auto" }}>
            {done.result.stdout || done.result.stderr}
          </pre>
          {done.reward > 0 && (
            <p>
              +{done.reward} shards earned{done.shardBalance !== null && ` (balance: ${done.shardBalance})`}
            </p>
          )}
        </div>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link href={`/leaderboard?challenge=${challengeId}`}>View leaderboard</Link> ·{" "}
        <Link href="/shop">Shop</Link>
      </p>
    </main>
  );
}

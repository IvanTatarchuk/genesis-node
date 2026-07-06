"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

/**
 * Submits a player-authored challenge. Deliberately narrow: one starter file
 * plus one `node --test`-style test file — see lib/challengeSource.ts's
 * validateSubmission for exactly what's accepted and why (the test command
 * a challenge ships with runs inside the sandbox for every other player who
 * attempts it, so it isn't free-form). New submissions start `pending` and
 * aren't visible to anyone else until a moderator approves them.
 */
export default function SubmitChallengePage() {
  const [authorName, setAuthorName] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [starterFile, setStarterFile] = useState("solution.js");
  const [starterContent, setStarterContent] = useState("");
  const [testFile, setTestFile] = useState("solution.test.js");
  const [testContent, setTestContent] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const res = await fetch("/api/challenges/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        authorName,
        title,
        prompt,
        files: { [starterFile]: starterContent, [testFile]: testContent },
        solutionFile: starterFile,
        testCommand: ["node", "--test", testFile],
      }),
    });
    const body = await res.json();

    if (!res.ok) {
      setError(body.error ?? `request failed (${res.status})`);
      setStatus("idle");
      return;
    }

    setStatus("submitted");
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Submit a challenge</h1>
      <p>
        <Link href="/">Back</Link>
      </p>

      <p style={{ color: "#555" }}>
        A moderator reviews every submission before it&apos;s visible to other players. You&apos;ll
        earn shards each time someone else&apos;s run against your challenge passes.
      </p>

      {status === "submitted" ? (
        <p>
          Submitted <strong>{slug}</strong> — pending review.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
          <label>
            Your name
            <input
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Slug (lowercase letters, numbers, hyphens — this becomes the challenge&apos;s id)
            <input
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Prompt (what the agent is asked to fix)
            <textarea
              required
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Starter file name (contains the bug)
            <input
              required
              value={starterFile}
              onChange={(e) => setStarterFile(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Starter file content
            <textarea
              required
              rows={8}
              value={starterContent}
              onChange={(e) => setStarterContent(e.target.value)}
              style={{ display: "block", width: "100%", fontFamily: "monospace" }}
            />
          </label>
          <label>
            Test file name (must end in .test.js)
            <input
              required
              pattern=".*\.test\.js"
              value={testFile}
              onChange={(e) => setTestFile(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Test file content (uses node:test + node:assert, same as the built-in challenges)
            <textarea
              required
              rows={8}
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              style={{ display: "block", width: "100%", fontFamily: "monospace" }}
            />
          </label>

          {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

          <button type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Submitting..." : "Submit for review"}
          </button>
        </form>
      )}
    </main>
  );
}

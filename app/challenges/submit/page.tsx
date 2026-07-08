"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

interface ExtraFile {
  name: string;
  content: string;
}

/**
 * Submits a player-authored challenge: one primary starter file, optionally
 * more editable files (for a multi-file challenge), plus one `node --test`-style
 * test file — see lib/challengeSource.ts's validateSubmission for exactly
 * what's accepted and why (the test command a challenge ships with runs inside
 * the sandbox for every other player who attempts it, so it isn't free-form;
 * the test file can never be one of the editable files). New submissions start
 * `pending` and aren't visible to anyone else until a moderator approves them.
 */
export default function SubmitChallengePage() {
  const [authorName, setAuthorName] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [starterFile, setStarterFile] = useState("solution.js");
  const [starterContent, setStarterContent] = useState("");
  const [extraFiles, setExtraFiles] = useState<ExtraFile[]>([]);
  const [testFile, setTestFile] = useState("solution.test.js");
  const [testContent, setTestContent] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">("idle");
  const [error, setError] = useState<string | null>(null);

  function updateExtra(index: number, patch: Partial<ExtraFile>) {
    setExtraFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const files: Record<string, string> = { [starterFile]: starterContent };
    for (const f of extraFiles) files[f.name] = f.content;
    files[testFile] = testContent;

    const res = await fetch("/api/challenges/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        authorName,
        title,
        prompt,
        files,
        solutionFile: starterFile,
        additionalSolutionFiles: extraFiles.map((f) => f.name),
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
          <fieldset style={{ border: "1px solid #ddd", borderRadius: 4, padding: "0.75rem", display: "grid", gap: "0.75rem" }}>
            <legend style={{ padding: "0 0.4rem", color: "#555" }}>
              Additional editable files (optional — for a multi-file challenge)
            </legend>
            <p style={{ margin: 0, color: "#777", fontSize: "0.85rem" }}>
              The agent may edit the starter file and any files added here. The test file can never be
              one of them.
            </p>
            {extraFiles.map((file, i) => (
              <div key={i} style={{ display: "grid", gap: "0.4rem", borderTop: "1px solid #eee", paddingTop: "0.5rem" }}>
                <label>
                  File name
                  <input
                    required
                    value={file.name}
                    onChange={(e) => updateExtra(i, { name: e.target.value })}
                    style={{ display: "block", width: "100%" }}
                  />
                </label>
                <label>
                  File content
                  <textarea
                    required
                    rows={6}
                    value={file.content}
                    onChange={(e) => updateExtra(i, { content: e.target.value })}
                    style={{ display: "block", width: "100%", fontFamily: "monospace" }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setExtraFiles((prev) => prev.filter((_, j) => j !== i))}
                  style={{ justifySelf: "start" }}
                >
                  Remove this file
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setExtraFiles((prev) => [...prev, { name: "", content: "" }])}
              style={{ justifySelf: "start" }}
            >
              Add another editable file
            </button>
          </fieldset>

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

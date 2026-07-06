import { NextResponse } from "next/server";

import { submitChallenge, type ChallengeSubmissionInput } from "@/lib/challengeSource";

export const runtime = "nodejs";

/**
 * Submits a player-authored challenge as `status: 'pending'` — see
 * lib/challengeSource.ts's validateSubmission for what's rejected outright
 * (arbitrary test commands, slug collisions, missing files) and
 * supabase/schema.sql for why it isn't listed or runnable by other players
 * until a moderator approves it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: Partial<ChallengeSubmissionInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { slug, authorName, title, prompt, files, solutionFile, testCommand } = body;
  if (!slug || !authorName || !title || !prompt || !files || !solutionFile || !testCommand) {
    return NextResponse.json(
      {
        error:
          "slug, authorName, title, prompt, files, solutionFile, and testCommand are all required",
      },
      { status: 400 }
    );
  }

  try {
    const submittedSlug = await submitChallenge({
      slug,
      authorName,
      title,
      prompt,
      files,
      solutionFile,
      testCommand,
    });
    return NextResponse.json({ slug: submittedSlug, status: "pending" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

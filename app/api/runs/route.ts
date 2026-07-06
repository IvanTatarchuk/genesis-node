import { NextResponse } from "next/server";

import { getChallenge } from "@/challenges";
import { runAgentLoop } from "@/lib/agentLoop";
import { recordRun } from "@/lib/supabase";

export const runtime = "nodejs";
// Multi-turn now: up to maxIterations LLM calls + sandboxed grading runs each,
// so this needs more headroom than a single-shot call did.
export const maxDuration = 300;

interface SubmitRunBody {
  challengeId?: string;
  playerName?: string;
  apiKey?: string;
  model?: string;
  maxIterations?: number;
}

/**
 * Runs a full loadout end to end: agent loop (LLM + sandboxed grading,
 * iterating on real test failures) -> leaderboard record. The caller's API
 * key is used for exactly this one request and is never persisted or logged.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: SubmitRunBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { challengeId, playerName, apiKey, model, maxIterations } = body;
  if (!challengeId || !playerName || !apiKey) {
    return NextResponse.json(
      { error: "challengeId, playerName, and apiKey are all required" },
      { status: 400 }
    );
  }

  let challenge;
  try {
    challenge = getChallenge(challengeId);
  } catch {
    return NextResponse.json({ error: `unknown challenge: ${challengeId}` }, { status: 404 });
  }

  let loopResult;
  try {
    loopResult = await runAgentLoop(challenge, { apiKey, model, maxIterations });
  } catch (error) {
    return NextResponse.json(
      { error: `agent call failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 502 }
    );
  }

  const { finalResult, iterations, transcript } = loopResult;

  try {
    await recordRun({
      challenge_id: challenge.id,
      player_name: playerName,
      model: model ?? "claude-sonnet-4-5",
      passed: finalResult.passed,
      duration_ms: finalResult.durationMs,
      iterations,
      stdout: finalResult.stdout.slice(0, 10_000),
      stderr: finalResult.stderr.slice(0, 10_000),
    });
  } catch (error) {
    // The run itself succeeded/failed and that's the important result for the
    // caller; a leaderboard-recording failure shouldn't mask it, just get logged.
    console.error("failed to record run to Supabase:", error);
  }

  return NextResponse.json({ result: finalResult, iterations, transcript });
}

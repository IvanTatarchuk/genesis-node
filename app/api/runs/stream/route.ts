import { runAgentLoop, type TranscriptEntry } from "@/lib/agentLoop";
import { resolveChallenge } from "@/lib/challengeSource";
import { calculateAuthorReward, calculateReward } from "@/lib/economy";
import { rewardMultiplier, validateLoadout } from "@/lib/loadouts";
import { awardShards, recordRun } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

interface SubmitRunBody {
  challengeId?: string;
  playerName?: string;
  apiKey?: string;
  model?: string;
  maxIterations?: number;
}

function sseEvent(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Same run as POST /api/runs, but streamed via Server-Sent Events: an
 * "iteration" event fires as each attempt is graded (live, not batched at the
 * end), then one "done" or "error" event. POST (not GET) so the caller's API
 * key travels in the body, not a URL that ends up in server logs/browser
 * history — which is also why this can't use the browser's native
 * EventSource (it only supports GET); the client reads the stream via fetch.
 */
export async function POST(request: Request): Promise<Response> {
  let body: SubmitRunBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400 });
  }

  const { challengeId, playerName, apiKey, model, maxIterations } = body;
  if (!challengeId || !playerName || !apiKey) {
    return new Response(
      JSON.stringify({ error: "challengeId, playerName, and apiKey are all required" }),
      { status: 400 }
    );
  }

  const loadout = validateLoadout({ model, maxIterations });
  if (!loadout.ok) {
    return new Response(JSON.stringify({ error: loadout.error }), { status: 400 });
  }

  let challenge, authorName;
  try {
    ({ challenge, authorName } = await resolveChallenge(challengeId));
  } catch {
    return new Response(JSON.stringify({ error: `unknown challenge: ${challengeId}` }), { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const onIteration = (entry: TranscriptEntry) => {
        controller.enqueue(sseEvent("iteration", entry));
      };

      try {
        const { finalResult, iterations } = await runAgentLoop(
          challenge,
          { apiKey, ...loadout.loadout },
          undefined,
          onIteration
        );

        try {
          await recordRun({
            challenge_id: challenge.id,
            player_name: playerName,
            model: loadout.loadout.model,
            passed: finalResult.passed,
            duration_ms: finalResult.durationMs,
            iterations,
            stdout: finalResult.stdout.slice(0, 10_000),
            stderr: finalResult.stderr.slice(0, 10_000),
          });
        } catch (error) {
          console.error("failed to record run to Supabase:", error);
        }

        const reward = calculateReward(
          finalResult.passed,
          iterations,
          rewardMultiplier(loadout.loadout.model)
        );
        let shardBalance: number | null = null;
        let claimToken: string | null = null;
        if (reward > 0) {
          try {
            const award = await awardShards(playerName, reward);
            shardBalance = award.shards;
            claimToken = award.claimToken;
          } catch (error) {
            console.error("failed to award shards:", error);
          }
        }

        // See app/api/runs/route.ts for why the author's own claimToken is
        // intentionally discarded here.
        const authorReward = calculateAuthorReward(finalResult.passed);
        if (authorReward > 0 && authorName && authorName !== playerName) {
          try {
            await awardShards(authorName, authorReward);
          } catch (error) {
            console.error("failed to award author shards:", error);
          }
        }

        controller.enqueue(
          sseEvent("done", { result: finalResult, iterations, reward, shardBalance, claimToken })
        );
      } catch (error) {
        controller.enqueue(
          sseEvent("error", { error: error instanceof Error ? error.message : String(error) })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

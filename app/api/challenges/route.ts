import { NextResponse } from "next/server";

import { listChallengeMetadata } from "@/lib/challengeSource";

export const runtime = "nodejs";

/** Built-in challenges plus approved player-authored ones, for the challenge selector. */
export async function GET(): Promise<NextResponse> {
  const metadata = await listChallengeMetadata();
  return NextResponse.json({ challenges: metadata });
}

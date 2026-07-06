import { NextResponse } from "next/server";

import { getCosmetic } from "@/lib/cosmetics";
import { purchaseCosmetic } from "@/lib/supabase";

export const runtime = "nodejs";

interface PurchaseBody {
  playerName?: string;
  cosmeticId?: string;
  claimToken?: string;
}

/**
 * Spends shards on a cosmetic. All balance checks and ownership guarantees
 * live in the purchase_cosmetic() Postgres function (see
 * supabase/schema.sql) — this route just validates the request shape and
 * relays the function's result/error.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: PurchaseBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { playerName, cosmeticId, claimToken } = body;
  if (!playerName || !cosmeticId || !claimToken) {
    return NextResponse.json(
      { error: "playerName, cosmeticId, and claimToken are all required" },
      { status: 400 }
    );
  }

  let cosmetic;
  try {
    cosmetic = getCosmetic(cosmeticId);
  } catch {
    return NextResponse.json({ error: `unknown cosmetic: ${cosmeticId}` }, { status: 404 });
  }

  try {
    const shardBalance = await purchaseCosmetic(playerName, cosmetic.id, cosmetic.cost, claimToken);
    return NextResponse.json({ shardBalance });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

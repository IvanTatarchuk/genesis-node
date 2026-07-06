import { NextResponse } from "next/server";

import { getCosmetic } from "@/lib/cosmetics";
import { equipCosmetic } from "@/lib/supabase";

export const runtime = "nodejs";

interface EquipBody {
  playerName?: string;
  cosmeticId?: string;
  claimToken?: string;
}

/**
 * Sets which owned cosmetic shows next to the player's name on the
 * leaderboard. Ownership is enforced by the equip_cosmetic() Postgres
 * function, not here — this route just validates shape and relays errors.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: EquipBody;
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

  try {
    getCosmetic(cosmeticId);
  } catch {
    return NextResponse.json({ error: `unknown cosmetic: ${cosmeticId}` }, { status: 404 });
  }

  try {
    await equipCosmetic(playerName, cosmeticId, claimToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

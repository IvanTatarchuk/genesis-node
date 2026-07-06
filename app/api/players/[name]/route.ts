import { NextResponse } from "next/server";

import { fetchOwnedCosmeticIds, fetchPlayer } from "@/lib/supabase";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * Read-only lookup for the shop/profile UI: current shard balance, equipped
 * cosmetic, and which cosmetics the player already owns. A player who has
 * never earned shards simply has null shards/no owned cosmetics — that's a
 * normal state, not an error.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { name } = await params;

  try {
    const [player, ownedCosmeticIds] = await Promise.all([
      fetchPlayer(name),
      fetchOwnedCosmeticIds(name),
    ]);

    return NextResponse.json({
      player: player ?? { player_name: name, shards: 0, active_cosmetic_id: null },
      ownedCosmeticIds,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface RunRecord {
  challenge_id: string;
  player_name: string;
  model: string;
  passed: boolean;
  duration_ms: number;
  iterations: number;
  stdout: string;
  stderr: string;
}

export interface LeaderboardRow {
  challenge_id: string;
  player_name: string;
  model: string;
  duration_ms: number;
  iterations: number;
  created_at: string;
  active_cosmetic_id: string | null;
}

export interface Player {
  player_name: string;
  shards: number;
  active_cosmetic_id: string | null;
}

export interface ChallengeRow {
  slug: string;
  author_name: string;
  title: string;
  prompt: string;
  files: Record<string, string>;
  solution_file: string;
  test_command: string[];
  status: "pending" | "approved" | "rejected";
}

interface ChallengeSubmission {
  slug: string;
  authorName: string;
  title: string;
  prompt: string;
  files: Record<string, string>;
  solutionFile: string;
  testCommand: string[];
}

let serverClient: SupabaseClient | undefined;

/**
 * Service-role client for server-side use only (API routes) — bypasses RLS,
 * so this must never be imported from client components. Throws with a clear
 * message if the project isn't configured yet, rather than failing deep
 * inside a query.
 */
export function getServerSupabaseClient(): SupabaseClient {
  if (serverClient) return serverClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. Create a Supabase project, run " +
        "supabase/schema.sql against it, and set both in .env.local before runs can be recorded."
    );
  }

  serverClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  return serverClient;
}

export async function recordRun(record: RunRecord): Promise<void> {
  const { error } = await getServerSupabaseClient().from("runs").insert(record);
  if (error) {
    throw new Error(`failed to record run: ${error.message}`);
  }
}

export async function fetchLeaderboard(challengeId: string): Promise<LeaderboardRow[]> {
  const { data, error } = await getServerSupabaseClient()
    .from("leaderboard")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("duration_ms", { ascending: true })
    .order("iterations", { ascending: true });

  if (error) {
    throw new Error(`failed to fetch leaderboard: ${error.message}`);
  }

  return data ?? [];
}

export async function fetchPlayer(playerName: string): Promise<Player | null> {
  const { data, error } = await getServerSupabaseClient()
    .from("players")
    .select("player_name, shards, active_cosmetic_id")
    .eq("player_name", playerName)
    .maybeSingle();

  if (error) {
    throw new Error(`failed to fetch player: ${error.message}`);
  }

  return data ?? null;
}

/**
 * Credits shards to a player, creating their row on the first award. Goes
 * through the award_shards() Postgres function so concurrent awards for the
 * same player can't race and drop one (see supabase/schema.sql).
 */
export async function awardShards(playerName: string, amount: number): Promise<number> {
  const { data, error } = await getServerSupabaseClient().rpc("award_shards", {
    p_player_name: playerName,
    p_amount: amount,
  });

  if (error) {
    throw new Error(`failed to award shards: ${error.message}`);
  }

  return data as number;
}

/**
 * Spends shards on a cosmetic via the purchase_cosmetic() function, which
 * raises (and this rejects) rather than allowing a negative balance or a
 * double purchase. Callers should surface error.message directly — it's
 * already a plain-English reason (insufficient funds, already owned, etc).
 */
export async function purchaseCosmetic(
  playerName: string,
  cosmeticId: string,
  cost: number
): Promise<number> {
  const { data, error } = await getServerSupabaseClient().rpc("purchase_cosmetic", {
    p_player_name: playerName,
    p_cosmetic_id: cosmeticId,
    p_cost: cost,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as number;
}

export async function equipCosmetic(playerName: string, cosmeticId: string): Promise<void> {
  const { error } = await getServerSupabaseClient().rpc("equip_cosmetic", {
    p_player_name: playerName,
    p_cosmetic_id: cosmeticId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchOwnedCosmeticIds(playerName: string): Promise<string[]> {
  const { data, error } = await getServerSupabaseClient()
    .from("player_cosmetics")
    .select("cosmetic_id")
    .eq("player_name", playerName);

  if (error) {
    throw new Error(`failed to fetch owned cosmetics: ${error.message}`);
  }

  return (data ?? []).map((row) => row.cosmetic_id as string);
}

/**
 * Inserts a player-authored challenge as `status: 'pending'` — it isn't
 * listed or runnable by anyone but its own author until a moderator approves
 * it (see moderateChallenge). Shape validation (slug format, testCommand
 * safelist, etc.) happens in lib/challengeSource.ts before this is called.
 */
export async function insertChallengeSubmission(input: ChallengeSubmission): Promise<string> {
  const { error } = await getServerSupabaseClient().from("challenges").insert({
    slug: input.slug,
    author_name: input.authorName,
    title: input.title,
    prompt: input.prompt,
    files: input.files,
    solution_file: input.solutionFile,
    test_command: input.testCommand,
  });

  if (error) {
    throw new Error(`failed to submit challenge: ${error.message}`);
  }

  return input.slug;
}

export async function fetchApprovedChallenges(): Promise<ChallengeRow[]> {
  const { data, error } = await getServerSupabaseClient()
    .from("challenges")
    .select("slug, author_name, title, prompt, files, solution_file, test_command, status")
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`failed to fetch challenges: ${error.message}`);
  }

  return data ?? [];
}

export async function fetchChallengeBySlug(slug: string): Promise<ChallengeRow | null> {
  const { data, error } = await getServerSupabaseClient()
    .from("challenges")
    .select("slug, author_name, title, prompt, files, solution_file, test_command, status")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`failed to fetch challenge: ${error.message}`);
  }

  return data ?? null;
}

/**
 * Approve or reject a pending submission. Restricted to callers who know
 * ADMIN_SECRET (see app/api/challenges/[id]/moderate/route.ts) — there is no
 * broader moderator role system yet, this is deliberately the simplest thing
 * that lets a submission ever leave 'pending'.
 */
export async function moderateChallenge(
  slug: string,
  status: "approved" | "rejected"
): Promise<void> {
  const { error } = await getServerSupabaseClient()
    .from("challenges")
    .update({ status })
    .eq("slug", slug);

  if (error) {
    throw new Error(`failed to update challenge status: ${error.message}`);
  }
}

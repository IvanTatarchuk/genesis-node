import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface RunRecord {
  challenge_id: string;
  player_name: string;
  model: string;
  passed: boolean;
  duration_ms: number;
  stdout: string;
  stderr: string;
}

export interface LeaderboardRow {
  challenge_id: string;
  player_name: string;
  model: string;
  duration_ms: number;
  created_at: string;
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
    .order("duration_ms", { ascending: true });

  if (error) {
    throw new Error(`failed to fetch leaderboard: ${error.message}`);
  }

  return data ?? [];
}

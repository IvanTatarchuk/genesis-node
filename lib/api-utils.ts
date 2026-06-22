import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type ServiceClient = ReturnType<typeof createServiceClient>;

export interface AuthContext {
  user: { id: string; email?: string };
  supabase: ServerSupabaseClient;
  service: ServiceClient;
}

/**
 * Authenticate the current request via Supabase cookies.
 * Returns an AuthContext on success, or a 401 NextResponse on failure.
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = createServiceClient();
  return { user, supabase, service };
}

/**
 * Type guard: returns true when requireAuth() yielded an error response.
 */
export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Verify the cron/admin secret on an incoming request.
 * Accepts Bearer token in Authorization header or x-admin-secret header.
 * Skips verification when NODE_ENV !== "production".
 */
export function verifyCronSecret(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const authHeader = req.headers.get("authorization") ?? "";
  const adminHeader = req.headers.get("x-admin-secret") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";
  const adminSecret = process.env.ADMIN_SECRET ?? "";

  const token = authHeader.replace("Bearer ", "");

  if (
    token === cronSecret ||
    token === adminSecret ||
    adminHeader === adminSecret
  ) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

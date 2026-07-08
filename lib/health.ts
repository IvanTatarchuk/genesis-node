/**
 * Pure readiness logic for the /api/health endpoint, kept separate from the
 * route so it's unit-testable without spinning up a server.
 *
 * Readiness semantics, deliberately chosen for how this app degrades:
 *   - The sandbox is a HARD dependency. Without usable `unshare` namespaces
 *     every run fails, so the service is genuinely not ready to do its job —
 *     the endpoint should signal not-ready (503) so a load balancer/orchestrator
 *     doesn't send it traffic.
 *   - Supabase is a SOFT dependency. Without it runs still execute (the caller
 *     gets their pass/fail); only persistence (leaderboard, shards) degrades,
 *     and every page handles that gracefully. So it's reported for visibility
 *     but does NOT gate readiness.
 */
export interface HealthCheck {
  ok: boolean;
  detail: string;
}

export interface HealthChecks {
  sandbox: HealthCheck;
  supabaseConfigured: boolean;
}

export interface HealthReport {
  /** Overall readiness — gated on hard dependencies only (the sandbox). */
  ready: boolean;
  status: "ok" | "degraded" | "not_ready";
  checks: {
    sandbox: HealthCheck;
    /** Soft dependency: informational, does not affect `ready`. */
    supabase: HealthCheck;
  };
}

export function summarizeHealth(checks: HealthChecks): HealthReport {
  const ready = checks.sandbox.ok;
  const supabase: HealthCheck = checks.supabaseConfigured
    ? { ok: true, detail: "configured" }
    : { ok: false, detail: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — runs won't persist" };

  const status: HealthReport["status"] = !ready ? "not_ready" : supabase.ok ? "ok" : "degraded";

  return { ready, status, checks: { sandbox: checks.sandbox, supabase } };
}

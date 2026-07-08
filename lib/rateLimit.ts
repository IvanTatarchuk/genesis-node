/**
 * In-memory token-bucket rate limiting.
 *
 * In-memory is the right fit here, not a limitation: grading needs the
 * `unshare` sandbox, which pins the app to a single host anyway (see the README
 * launch notes), so there's no second instance a shared store would coordinate.
 * If that ever changes, swap the Map for Redis behind the same `check()`.
 *
 * A token bucket (rather than a fixed window) allows a short burst up to
 * `capacity` and then a steady sustained rate, which matches how a real player
 * uses the run button — a few in quick succession, then spaced out — while
 * still capping an abuser hammering the expensive routes (each run is a real
 * sandboxed grading pass plus a model call).
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until one token is available again (0 when allowed). */
  retryAfterMs: number;
  /** Whole tokens left in the bucket after this check. */
  remaining: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; last: number }>();

  /**
   * @param capacity     max tokens (the burst size).
   * @param refillPerMs  tokens replenished per millisecond (the sustained rate).
   * @param now          clock, injectable so the refill logic is unit-testable.
   * @param maxKeys      soft cap on tracked keys; idle full buckets are pruned past it.
   */
  constructor(
    private readonly capacity: number,
    private readonly refillPerMs: number,
    private readonly now: () => number = () => Date.now(),
    private readonly maxKeys = 10_000
  ) {}

  check(key: string): RateLimitResult {
    const t = this.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.capacity, last: t };
      this.buckets.set(key, bucket);
    } else {
      const elapsed = t - bucket.last;
      bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.refillPerMs);
      bucket.last = t;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.maybePrune();
      return { allowed: true, retryAfterMs: 0, remaining: Math.floor(bucket.tokens) };
    }

    const retryAfterMs = Math.ceil((1 - bucket.tokens) / this.refillPerMs);
    return { allowed: false, retryAfterMs, remaining: 0 };
  }

  /**
   * Keep the map from growing without bound: once past `maxKeys`, drop buckets
   * that have refilled to capacity — a full bucket is indistinguishable from a
   * never-seen key, so forgetting it changes nothing.
   */
  private maybePrune(): void {
    if (this.buckets.size <= this.maxKeys) return;
    const t = this.now();
    for (const [key, b] of this.buckets) {
      const refilled = Math.min(this.capacity, b.tokens + (t - b.last) * this.refillPerMs);
      if (refilled >= this.capacity) this.buckets.delete(key);
    }
  }
}

/**
 * Best-effort client identity for rate limiting: the first hop of
 * `X-Forwarded-For`, then `X-Real-IP`, then a shared fallback. **Only trust
 * these behind a proxy you control** — a directly-exposed app can have them
 * spoofed. The `"unknown"` fallback means keyless direct callers share one
 * bucket, which is the safe default (fail closed to a shared limit).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  return "unknown";
}

// Shared instances. Both run routes share one limiter — /api/runs and
// /api/runs/stream are the same expensive operation, so they draw from one
// budget per client. Tunable here.
const RUN_BURST = 5;
const RUN_PER_MINUTE = 5;
const SUBMIT_BURST = 5;
const SUBMIT_PER_MINUTE = 10;

export const runLimiter = new RateLimiter(RUN_BURST, RUN_PER_MINUTE / 60_000);
export const submitLimiter = new RateLimiter(SUBMIT_BURST, SUBMIT_PER_MINUTE / 60_000);

/** Seconds to advertise in a `Retry-After` header for a blocked result. */
export function retryAfterSeconds(result: RateLimitResult): number {
  return Math.max(1, Math.ceil(result.retryAfterMs / 1000));
}

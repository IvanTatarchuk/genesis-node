/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Uses a sliding window per IP address.
 * For production scale, replace with Redis/Upstash.
 */

interface Window {
  count: number;
  resetAt: number;
}

// Global store (per-process, resets on deployment)
const store = new Map<string, Window>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of store.entries()) {
    if (window.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp ms
}

/**
 * Check and record a request for the given key.
 * Key should be: `route:ip` or `route:userId`
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSec * 1000;

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    // New window
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  if (existing.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return { allowed: true, remaining: config.limit - existing.count, resetAt: existing.resetAt };
}

/** Extract the real client IP from a NextRequest */
export function getClientIp(req: Request): string {
  const headers = req.headers as Headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── Pre-configured limiters ────────────────────────────────────────────────────

/** 10 task creations per user per minute */
export const TASK_RATE_LIMIT: RateLimitConfig = { limit: 10, windowSec: 60 };

/** 5 checkout sessions per IP per minute */
export const CHECKOUT_RATE_LIMIT: RateLimitConfig = { limit: 5, windowSec: 60 };

/** 30 API requests per key per minute */
export const API_KEY_RATE_LIMIT: RateLimitConfig = { limit: 30, windowSec: 60 };

/** 20 requests per IP per minute for general endpoints */
export const GENERAL_RATE_LIMIT: RateLimitConfig = { limit: 20, windowSec: 60 };

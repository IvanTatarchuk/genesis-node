import { describe, it, expect, beforeEach, vi } from "vitest";

// The module-level setInterval fires on import, so we mock timers first.
vi.useFakeTimers();

// Dynamic import so the store starts fresh after fake-timers are active.
const { rateLimit, getClientIp, TASK_RATE_LIMIT, CHECKOUT_RATE_LIMIT, API_KEY_RATE_LIMIT, GENERAL_RATE_LIMIT } =
  await import("../rate-limit");

describe("rateLimit", () => {
  beforeEach(() => {
    // Reset the internal store between tests by exhausting a unique key each time.
    vi.setSystemTime(Date.now());
  });

  it("allows the first request and returns correct remaining count", () => {
    const key = `test:${Math.random()}`;
    const result = rateLimit(key, { limit: 5, windowSec: 60 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1);
  });

  it("decrements remaining on each request", () => {
    const key = `test:${Math.random()}`;
    const cfg = { limit: 3, windowSec: 60 };

    const r1 = rateLimit(key, cfg);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit(key, cfg);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit(key, cfg);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests after limit is reached", () => {
    const key = `test:${Math.random()}`;
    const cfg = { limit: 2, windowSec: 60 };

    rateLimit(key, cfg);
    rateLimit(key, cfg);

    const r3 = rateLimit(key, cfg);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("resets the window after windowSec elapses", () => {
    const key = `test:${Math.random()}`;
    const cfg = { limit: 1, windowSec: 10 };

    rateLimit(key, cfg);
    const blocked = rateLimit(key, cfg);
    expect(blocked.allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(11_000);

    const afterReset = rateLimit(key, cfg);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(0); // limit 1 - 1 = 0
  });

  it("keeps the same resetAt within the same window", () => {
    const key = `test:${Math.random()}`;
    const cfg = { limit: 5, windowSec: 60 };

    const r1 = rateLimit(key, cfg);
    const r2 = rateLimit(key, cfg);
    expect(r1.resetAt).toBe(r2.resetAt);
  });

  it("handles limit of 1 correctly", () => {
    const key = `test:${Math.random()}`;
    const cfg = { limit: 1, windowSec: 60 };

    const r1 = rateLimit(key, cfg);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(0);

    const r2 = rateLimit(key, cfg);
    expect(r2.allowed).toBe(false);
  });

  it("isolates different keys", () => {
    const keyA = `test:a:${Math.random()}`;
    const keyB = `test:b:${Math.random()}`;
    const cfg = { limit: 1, windowSec: 60 };

    rateLimit(keyA, cfg);
    const rB = rateLimit(keyB, cfg);
    expect(rB.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it('returns "unknown" when no IP headers are present', () => {
    const req = new Request("https://example.com");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trims whitespace from forwarded IP", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "  9.8.7.6  , 1.1.1.1" },
    });
    expect(getClientIp(req)).toBe("9.8.7.6");
  });
});

describe("pre-configured rate limit constants", () => {
  it("TASK_RATE_LIMIT is 10 req / 60s", () => {
    expect(TASK_RATE_LIMIT).toEqual({ limit: 10, windowSec: 60 });
  });

  it("CHECKOUT_RATE_LIMIT is 5 req / 60s", () => {
    expect(CHECKOUT_RATE_LIMIT).toEqual({ limit: 5, windowSec: 60 });
  });

  it("API_KEY_RATE_LIMIT is 30 req / 60s", () => {
    expect(API_KEY_RATE_LIMIT).toEqual({ limit: 30, windowSec: 60 });
  });

  it("GENERAL_RATE_LIMIT is 20 req / 60s", () => {
    expect(GENERAL_RATE_LIMIT).toEqual({ limit: 20, windowSec: 60 });
  });
});

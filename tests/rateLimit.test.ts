import { describe, expect, it } from "vitest";

import { getClientIp, RateLimiter, retryAfterSeconds } from "../lib/rateLimit";

describe("RateLimiter", () => {
  it("allows a burst up to capacity, then blocks", () => {
    const limiter = new RateLimiter(3, 1 / 1000, () => 0);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("reports remaining tokens", () => {
    const limiter = new RateLimiter(3, 1 / 1000, () => 0);
    expect(limiter.check("a").remaining).toBe(2);
    expect(limiter.check("a").remaining).toBe(1);
    expect(limiter.check("a").remaining).toBe(0);
  });

  it("refills over time at the sustained rate", () => {
    let now = 0;
    const limiter = new RateLimiter(1, 1 / 1000, () => now); // 1 token/sec
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    now = 1000; // one second later -> one token back
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("reports how long until the next token", () => {
    let now = 0;
    const limiter = new RateLimiter(1, 1 / 1000, () => now); // 1 token/sec
    limiter.check("a");
    const blocked = limiter.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(1000);
    now = 400;
    expect(limiter.check("a").retryAfterMs).toBe(600);
  });

  it("tracks keys independently", () => {
    const limiter = new RateLimiter(1, 1 / 1000, () => 0);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true); // b has its own bucket
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("never lets tokens exceed capacity no matter how long it idles", () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1 / 1000, () => now);
    limiter.check("a"); // spend 1 -> 1 left
    now = 10_000_000; // idle a very long time
    // capacity is 2, so only 2 allowed even after huge idle
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });
});

describe("retryAfterSeconds", () => {
  it("rounds up and is at least 1", () => {
    expect(retryAfterSeconds({ allowed: false, retryAfterMs: 1, remaining: 0 })).toBe(1);
    expect(retryAfterSeconds({ allowed: false, retryAfterMs: 1500, remaining: 0 })).toBe(2);
  });
});

describe("getClientIp", () => {
  function req(headers: Record<string, string>): Request {
    return new Request("http://x/", { headers });
  }

  it("uses the first hop of X-Forwarded-For", () => {
    expect(getClientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("falls back to X-Real-IP", () => {
    expect(getClientIp(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("falls back to a shared key when no proxy headers are present", () => {
    expect(getClientIp(req({}))).toBe("unknown");
  });
});

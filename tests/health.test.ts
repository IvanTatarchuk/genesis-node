import { describe, expect, it } from "vitest";

import { summarizeHealth } from "../lib/health";

describe("summarizeHealth", () => {
  it("is ready + ok when the sandbox works and Supabase is configured", () => {
    const report = summarizeHealth({
      sandbox: { ok: true, detail: "ns available" },
      supabaseConfigured: true,
    });
    expect(report.ready).toBe(true);
    expect(report.status).toBe("ok");
    expect(report.checks.supabase.ok).toBe(true);
  });

  it("is ready but degraded when the sandbox works and Supabase is not configured", () => {
    const report = summarizeHealth({
      sandbox: { ok: true, detail: "ns available" },
      supabaseConfigured: false,
    });
    // Supabase is a soft dependency — runs still work, so it stays ready.
    expect(report.ready).toBe(true);
    expect(report.status).toBe("degraded");
    expect(report.checks.supabase.ok).toBe(false);
    expect(report.checks.supabase.detail).toMatch(/SUPABASE/);
  });

  it("is not ready whenever the sandbox is unusable, regardless of Supabase", () => {
    for (const supabaseConfigured of [true, false]) {
      const report = summarizeHealth({
        sandbox: { ok: false, detail: "Operation not permitted" },
        supabaseConfigured,
      });
      expect(report.ready).toBe(false);
      expect(report.status).toBe("not_ready");
    }
  });

  it("passes the sandbox detail through untouched", () => {
    const report = summarizeHealth({
      sandbox: { ok: false, detail: "unshare: Operation not permitted" },
      supabaseConfigured: true,
    });
    expect(report.checks.sandbox.detail).toBe("unshare: Operation not permitted");
  });
});

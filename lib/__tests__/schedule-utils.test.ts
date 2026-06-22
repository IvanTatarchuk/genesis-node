import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addDays, addHours, addMonths, formatNextRun, HOURS, DAYS_OF_WEEK } from "../schedule-utils";

describe("addDays", () => {
  it("adds positive days", () => {
    const base = new Date("2025-01-10T12:00:00Z");
    const result = addDays(base, 5);
    expect(result.getDate()).toBe(15);
  });

  it("does not mutate the input date", () => {
    const base = new Date("2025-01-10T12:00:00Z");
    addDays(base, 5);
    expect(base.getDate()).toBe(10);
  });

  it("handles negative days", () => {
    const base = new Date("2025-01-10T12:00:00Z");
    const result = addDays(base, -3);
    expect(result.getDate()).toBe(7);
  });

  it("crosses month boundaries", () => {
    const base = new Date("2025-01-30T00:00:00Z");
    const result = addDays(base, 3);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(2);
  });

  it("handles zero days", () => {
    const base = new Date("2025-06-15T08:00:00Z");
    const result = addDays(base, 0);
    expect(result.getTime()).toBe(base.getTime());
  });
});

describe("addHours", () => {
  it("adds positive hours", () => {
    const base = new Date("2025-01-10T10:00:00Z");
    const result = addHours(base, 3);
    expect(result.getUTCHours()).toBe(13);
  });

  it("does not mutate the input date", () => {
    const base = new Date("2025-01-10T10:00:00Z");
    addHours(base, 3);
    expect(base.getUTCHours()).toBe(10);
  });

  it("crosses day boundaries", () => {
    const base = new Date("2025-01-10T22:00:00Z");
    const result = addHours(base, 5);
    expect(result.getUTCDate()).toBe(11);
    expect(result.getUTCHours()).toBe(3);
  });

  it("handles negative hours", () => {
    const base = new Date("2025-01-10T05:00:00Z");
    const result = addHours(base, -3);
    expect(result.getUTCHours()).toBe(2);
  });
});

describe("addMonths", () => {
  it("adds positive months", () => {
    const base = new Date("2025-01-15T00:00:00Z");
    const result = addMonths(base, 2);
    expect(result.getMonth()).toBe(2); // March
  });

  it("does not mutate the input date", () => {
    const base = new Date("2025-01-15T00:00:00Z");
    addMonths(base, 2);
    expect(base.getMonth()).toBe(0);
  });

  it("crosses year boundaries", () => {
    const base = new Date("2025-11-10T00:00:00Z");
    const result = addMonths(base, 3);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1); // February
  });

  it("handles end-of-month overflow (Jan 31 + 1 month)", () => {
    const base = new Date("2025-01-31T00:00:00Z");
    const result = addMonths(base, 1);
    // JS Date rolls over: Feb 31 -> Mar 3 (non-leap)
    expect(result.getMonth()).toBe(2); // March
  });
});

describe("formatNextRun", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Not scheduled" for null', () => {
    expect(formatNextRun(null)).toBe("Not scheduled");
  });

  it('returns "Overdue" for past dates', () => {
    expect(formatNextRun("2025-06-14T00:00:00Z")).toBe("Overdue");
  });

  it('returns "< 1 hour" for dates within the next hour', () => {
    // 15 minutes ahead: Math.round(15min / 60) = 0, which is < 1
    expect(formatNextRun("2025-06-15T12:15:00Z")).toBe("< 1 hour");
  });

  it('returns "in Xh" for dates within 24 hours', () => {
    const result = formatNextRun("2025-06-15T18:00:00Z");
    expect(result).toBe("in 6h");
  });

  it('returns "tomorrow" for dates ~1 day away', () => {
    expect(formatNextRun("2025-06-16T12:00:00Z")).toBe("tomorrow");
  });

  it('returns "in X days" for dates 2-6 days away', () => {
    const result = formatNextRun("2025-06-18T12:00:00Z");
    expect(result).toBe("in 3 days");
  });

  it("returns formatted date for dates >= 7 days away", () => {
    const result = formatNextRun("2025-06-25T14:00:00Z");
    // The exact locale string varies, but it should contain "Jun" and "25"
    expect(result).toContain("25");
  });
});

describe("HOURS constant", () => {
  it("has 24 entries", () => {
    expect(HOURS).toHaveLength(24);
  });

  it("starts at 00:00 and ends at 23:00", () => {
    expect(HOURS[0]).toEqual({ value: 0, label: "00:00" });
    expect(HOURS[23]).toEqual({ value: 23, label: "23:00" });
  });

  it("pads single-digit hours", () => {
    expect(HOURS[5].label).toBe("05:00");
  });
});

describe("DAYS_OF_WEEK constant", () => {
  it("has 7 entries", () => {
    expect(DAYS_OF_WEEK).toHaveLength(7);
  });

  it("starts with Sunday (0) and ends with Saturday (6)", () => {
    expect(DAYS_OF_WEEK[0]).toEqual({ value: 0, label: "Sunday" });
    expect(DAYS_OF_WEEK[6]).toEqual({ value: 6, label: "Saturday" });
  });
});

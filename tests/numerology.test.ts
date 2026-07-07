import { describe, expect, it } from "vitest";

import {
  birthdayNumber,
  expressionNumber,
  fullReading,
  letterValue,
  lifePathNumber,
  meaningOf,
  parseBirthDate,
  personalYearNumber,
  personalityNumber,
  reduceNumber,
  soulUrgeNumber,
  type BirthDate,
} from "../lib/numerology";

// Ivan's own data, used as the worked example throughout.
const IVAN_DATE: BirthDate = { day: 12, month: 2, year: 1994 };
const IVAN_NAME = "Ivan Tatarchuk";

describe("reduceNumber", () => {
  it("collapses to a single digit", () => {
    expect(reduceNumber(28)).toBe(1); // 2 + 8 = 10 -> 1
    expect(reduceNumber(1994)).toBe(5); // 1+9+9+4 = 23 -> 5
    expect(reduceNumber(9)).toBe(9);
  });

  it("preserves master numbers by default", () => {
    expect(reduceNumber(29)).toBe(11); // 2 + 9 = 11
    expect(reduceNumber(38)).toBe(11); // 3 + 8 = 11
    expect(reduceNumber(2299)).toBe(22); // 2+2+9+9 = 22
  });

  it("reduces master numbers when asked", () => {
    expect(reduceNumber(29, false)).toBe(2);
    expect(reduceNumber(2299, false)).toBe(4);
  });

  it("treats negatives by magnitude", () => {
    expect(reduceNumber(-28)).toBe(1);
  });
});

describe("parseBirthDate", () => {
  it("parses DD.MM.YYYY", () => {
    expect(parseBirthDate("12.02.1994")).toEqual(IVAN_DATE);
    expect(parseBirthDate("1.2.1994")).toEqual({ day: 1, month: 2, year: 1994 });
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => parseBirthDate("1994-02-12")).toThrow();
    expect(() => parseBirthDate("32.01.1994")).toThrow();
    expect(() => parseBirthDate("29.02.1994")).toThrow(); // 1994 wasn't a leap year
  });
});

describe("core numbers for Ivan", () => {
  it("life path is 1 (the pioneer)", () => {
    // month 2, day 12->3, year 1994->5 ; 2+3+5 = 10 -> 1
    expect(lifePathNumber(IVAN_DATE)).toBe(1);
  });

  it("birthday number is 3", () => {
    expect(birthdayNumber(IVAN_DATE)).toBe(3);
  });

  it("expression number is 5", () => {
    expect(expressionNumber(IVAN_NAME)).toBe(5);
  });

  it("soul urge number is 6", () => {
    expect(soulUrgeNumber(IVAN_NAME)).toBe(6);
  });

  it("personality number is 8", () => {
    expect(personalityNumber(IVAN_NAME)).toBe(8);
  });

  it("personal year for 2026 is 6 (rebuilding)", () => {
    // month 2, day 3, year 2026->1 ; 2+3+1 = 6
    expect(personalYearNumber(IVAN_DATE, 2026)).toBe(6);
  });

  it("soul urge + personality reduce back to the expression number", () => {
    // A structural sanity check: vowels + consonants = all letters.
    const combined = reduceNumber(soulUrgeNumber(IVAN_NAME) + personalityNumber(IVAN_NAME));
    expect(combined).toBe(expressionNumber(IVAN_NAME)); // 6 + 8 = 14 -> 5
  });
});

describe("letterValue", () => {
  it("maps A-Z onto 1-9 cyclically", () => {
    expect(letterValue("a")).toBe(1);
    expect(letterValue("I")).toBe(9);
    expect(letterValue("j")).toBe(1);
    expect(letterValue("z")).toBe(8);
  });

  it("returns 0 for non-Latin or non-letters", () => {
    expect(letterValue(" ")).toBe(0);
    expect(letterValue("2")).toBe(0);
    expect(letterValue("і")).toBe(0); // Cyrillic i
  });
});

describe("fullReading", () => {
  it("bundles every core number", () => {
    const reading = fullReading(IVAN_NAME, IVAN_DATE, 2026);
    expect(reading).toMatchObject({
      lifePath: 1,
      birthday: 3,
      expression: 5,
      soulUrge: 6,
      personality: 8,
      personalYear: 6,
    });
  });
});

describe("meaningOf", () => {
  it("has copy for every core number and master number", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) {
      expect(meaningOf(n).title.length).toBeGreaterThan(0);
    }
  });

  it("falls back safely for unknown numbers", () => {
    expect(meaningOf(99).keywords).toEqual([]);
  });
});

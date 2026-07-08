import { describe, expect, it } from "vitest";

import { DEFAULT_ROLE, isRoleId, resolveRole, roleLabel, ROLES } from "../lib/roles";

describe("roles catalog", () => {
  it("has exactly the two registration roles with unique ids", () => {
    const ids = ROLES.map((r) => r.id).sort();
    expect(ids).toEqual(["breaker", "defender"]);
  });

  it("has a default role that is one of the roles", () => {
    expect(ROLES.some((r) => r.id === DEFAULT_ROLE)).toBe(true);
  });

  it("describes what each role does", () => {
    for (const role of ROLES) {
      expect(role.label.length).toBeGreaterThan(0);
      expect(role.does.length).toBeGreaterThan(0);
    }
  });
});

describe("isRoleId", () => {
  it("accepts the two known roles", () => {
    expect(isRoleId("breaker")).toBe(true);
    expect(isRoleId("defender")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isRoleId("hacker")).toBe(false);
    expect(isRoleId("")).toBe(false);
    expect(isRoleId(undefined)).toBe(false);
    expect(isRoleId(42)).toBe(false);
  });
});

describe("resolveRole / roleLabel", () => {
  it("resolves a known role to its object", () => {
    expect(resolveRole("breaker")?.label).toBe("Breaker");
  });

  it("returns undefined for an unknown role", () => {
    expect(resolveRole("nope")).toBeUndefined();
  });

  it("labels a known role and passes an unknown value through", () => {
    expect(roleLabel("defender")).toBe("Defender");
    expect(roleLabel("mystery")).toBe("mystery");
  });
});

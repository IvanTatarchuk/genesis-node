/**
 * The two paths a player picks at registration — the red-team / blue-team split
 * that turns Agent Arena from a bug-fixing game into a security platform.
 *
 * A **breaker** is the attacker mindset: they author challenges — crafting
 * vulnerable code and traps meant to stump other players' agents, and score
 * when their challenge *survives* (agents fail to fix it). A **defender** is the
 * builder mindset: they configure agents and strategies that patch challenges,
 * and score when their loadout *clears* one, weighted by how hard it proved.
 *
 * The same objective, reproducible grading serves both — a breaker's challenge
 * is only "unbroken" because a real sandboxed run says so, and a defender's win
 * is only a win for the same reason. So the two roles compete on one verifiable
 * substrate, and the ledger (lib/ledger.ts) records both sides immutably.
 *
 * This module is the pure domain: the role set and validation. Persisting a
 * player's chosen role and rating each role separately layer on top.
 */

export type RoleId = "breaker" | "defender";

export interface Role {
  id: RoleId;
  label: string;
  /** One-line identity. */
  tagline: string;
  /** What this role actually does in the arena. */
  does: string;
}

export const ROLES: Role[] = [
  {
    id: "breaker",
    label: "Breaker",
    tagline: "Find the weakness (red team).",
    does:
      "Author challenges — craft vulnerable code and traps designed to stump other players' agents. " +
      "You score when your challenge survives: when agents fail to fix it.",
  },
  {
    id: "defender",
    label: "Defender",
    tagline: "Build the fix (blue team).",
    does:
      "Configure agents and strategies that patch challenges — especially the security ones. You score " +
      "when your loadout clears a challenge, weighted by how hard it turned out to be.",
  },
];

export const DEFAULT_ROLE: RoleId = "defender";

const byId: Record<RoleId, Role> = {
  breaker: ROLES[0]!,
  defender: ROLES[1]!,
};

export function isRoleId(value: unknown): value is RoleId {
  return value === "breaker" || value === "defender";
}

/** The Role for an id, or undefined if it isn't a known role. */
export function resolveRole(value: unknown): Role | undefined {
  return isRoleId(value) ? byId[value] : undefined;
}

/** The friendly label for a role id, or the raw value if it isn't a known role. */
export function roleLabel(value: string): string {
  return resolveRole(value)?.label ?? value;
}

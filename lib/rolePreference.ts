/**
 * Client-side storage for the player's chosen role (breaker / defender — see
 * lib/roles.ts). This is the "pick a path at registration" choice, persisted so
 * the arena can frame itself for that player on return. Client-only and
 * advisory for now (it tailors the UI, it doesn't gate anything), matching the
 * project's "no accounts yet" scope; persisting the role on the player row is
 * the next step once there's a real account.
 */

import { DEFAULT_ROLE, isRoleId, type RoleId } from "./roles";

const STORAGE_KEY = "agent-arena:role";

export function getStoredRole(): RoleId | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isRoleId(stored) ? stored : null;
}

export function storeRole(role: RoleId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, role);
}

/** The stored role, falling back to the default when none has been chosen. */
export function currentRole(): RoleId {
  return getStoredRole() ?? DEFAULT_ROLE;
}

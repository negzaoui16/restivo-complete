/**
 * Publication rules, kept free of imports so node:test can run them directly.
 *
 * A restaurant becomes visible to customers when it is ACTIVE. It may only
 * become ACTIVE while it has at least one active floor that holds at least
 * one active table.
 */

export type PublishFloor = {
  isActive: boolean;
  activeTableCount: number;
};

export type PublishBlocker = "NO_ACTIVE_FLOOR" | "NO_TABLE";

export const PUBLISH_BLOCKER_MESSAGES: Record<PublishBlocker, string> = {
  NO_ACTIVE_FLOOR: "Add an active floor before publishing your restaurant.",
  NO_TABLE:
    "Place at least one table on an active floor and save the floor plan before publishing your restaurant.",
};

export function publishBlocker(floors: PublishFloor[]): PublishBlocker | null {
  const active = floors.filter((floor) => floor.isActive);
  if (active.length === 0) return "NO_ACTIVE_FLOOR";
  if (!active.some((floor) => floor.activeTableCount > 0)) return "NO_TABLE";
  return null;
}

export type PublishableStatus = "DRAFT" | "ACTIVE";

/**
 * `same`   - nothing to change
 * `locked` - SUSPENDED / ARCHIVED restaurants are not managed from here
 * `ok`     - DRAFT <-> ACTIVE
 */
export function statusChange(current: string, next: PublishableStatus): "same" | "locked" | "ok" {
  if (current === next) return "same";
  if (current !== "DRAFT" && current !== "ACTIVE") return "locked";
  return "ok";
}

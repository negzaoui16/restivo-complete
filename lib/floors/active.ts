/**
 * When a floor may be switched off, as pure rules (no imports, so node:test runs them).
 *
 * A floor with a reservation that is upcoming or in progress on one of its tables
 * stays on; so does the last floor that keeps a published restaurant bookable.
 */

export type DeactivationBlocker = "HAS_RESERVATIONS" | "LAST_ACTIVE_FLOOR";

/** Statuses that hold a table, as in the booking rules. */
const HOLDING = ["PENDING", "CONFIRMED", "SEATED"];

/** True for a reservation that still needs its table: not over, not cancelled, not missed. */
export function holdsTable(status: string, endsAtMs: number, nowMs: number): boolean {
  return HOLDING.includes(status) && endsAtMs > nowMs;
}

export function deactivationBlocker(input: {
  restaurantStatus: string;
  /** Reservations that hold a table of this floor right now or later. */
  holdingReservations: number;
  /** True when the other floors alone would still let the restaurant be published. */
  othersKeepItPublishable: boolean;
}): DeactivationBlocker | null {
  if (input.holdingReservations > 0) return "HAS_RESERVATIONS";
  if (input.restaurantStatus === "ACTIVE" && !input.othersKeepItPublishable) return "LAST_ACTIVE_FLOOR";
  return null;
}

/**
 * What a STAFF member of a restaurant may see and do, as pure functions (no imports, so node:test
 * runs them). Staff seat and complete reservations and move kitchen orders forward. They cannot
 * cancel, record a no-show, confirm a pending order, or see money.
 */

export const STAFF_RESERVATION_TARGETS = ["SEATED", "COMPLETED"] as const;
export const STAFF_ORDER_TARGETS = ["PREPARING", "READY", "DELIVERED"] as const;

export type StaffReservationTarget = (typeof STAFF_RESERVATION_TARGETS)[number];
export type StaffOrderTarget = (typeof STAFF_ORDER_TARGETS)[number];

/** Reservations shown on the staff board (today). Cancelled and missed ones are not. */
export const STAFF_RESERVATION_STATUSES = ["PENDING", "CONFIRMED", "SEATED", "COMPLETED"] as const;
/** Orders shown on the staff board: a manager has confirmed them (PENDING ones are not for staff yet). */
export const STAFF_ORDER_STATUSES = ["CONFIRMED", "PREPARING", "READY", "DELIVERED"] as const;

export function isStaffReservationTarget(status: string): status is StaffReservationTarget {
  return (STAFF_RESERVATION_TARGETS as readonly string[]).includes(status);
}

export function isStaffOrderTarget(status: string): status is StaffOrderTarget {
  return (STAFF_ORDER_TARGETS as readonly string[]).includes(status);
}

/** The moves a staff member is offered: the allowed ones among those the transitions permit. */
export function staffReservationActions(actions: readonly string[]): StaffReservationTarget[] {
  return actions.filter(isStaffReservationTarget);
}

export function staffOrderActions(actions: readonly string[]): StaffOrderTarget[] {
  return actions.filter(isStaffOrderTarget);
}

export type StaffAccessVerdict = "OK" | "NOT_A_MEMBER" | "NOT_STAFF" | "INACTIVE";

/**
 * Decides from the membership of the signed-in user in THIS restaurant (null when there is none).
 * Another restaurant's staff, and an unknown restaurant, both come out as NOT_A_MEMBER.
 */
export function staffAccessVerdict(membership: { role: string; status: string } | null): StaffAccessVerdict {
  if (!membership) return "NOT_A_MEMBER";
  if (membership.status !== "ACTIVE") return "INACTIVE";
  if (membership.role !== "STAFF") return "NOT_STAFF";
  return "OK";
}

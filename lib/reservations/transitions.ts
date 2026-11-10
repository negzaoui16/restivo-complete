/**
 * Manager-side reservation lifecycle, as pure rules.
 *
 *   PENDING   -> CONFIRMED | SEATED | NO_SHOW | CANCELLED
 *   CONFIRMED -> SEATED | NO_SHOW | CANCELLED
 *   SEATED    -> COMPLETED
 *   COMPLETED, CANCELLED, NO_SHOW are final.
 *
 * Timing: guests can be seated from 30 minutes before the slot until it ends;
 * a no-show can only be recorded 15 minutes after the slot starts.
 * No imports, so node:test runs it.
 */

export type ManagedReservationStatus = "PENDING" | "CONFIRMED" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export const SEAT_EARLY_MINUTES = 30;
export const NO_SHOW_AFTER_MINUTES = 15;

export type ReservationClock = { nowMs: number; startsAtMs: number; endsAtMs: number };

export type ReservationTransition =
  | { ok: true }
  | { ok: false; code: "INVALID_TRANSITION" | "TOO_EARLY" | "TOO_LATE"; message: string };

const MINUTE_MS = 60_000;

const NEXT: Record<ManagedReservationStatus, readonly ManagedReservationStatus[]> = {
  PENDING: ["CONFIRMED", "SEATED", "NO_SHOW", "CANCELLED"],
  CONFIRMED: ["SEATED", "NO_SHOW", "CANCELLED"],
  SEATED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function isFinalReservation(status: ManagedReservationStatus): boolean {
  return NEXT[status].length === 0;
}

export function reservationTransition(
  from: ManagedReservationStatus,
  to: ManagedReservationStatus,
  clock: ReservationClock,
): ReservationTransition {
  if (!NEXT[from]?.includes(to)) {
    return { ok: false, code: "INVALID_TRANSITION", message: `A ${label(from)} reservation cannot become ${label(to)}.` };
  }
  if (to === "SEATED") {
    if (clock.nowMs < clock.startsAtMs - SEAT_EARLY_MINUTES * MINUTE_MS) {
      return {
        ok: false,
        code: "TOO_EARLY",
        message: `Guests can be seated from ${SEAT_EARLY_MINUTES} minutes before the reservation.`,
      };
    }
    if (clock.nowMs > clock.endsAtMs) {
      return { ok: false, code: "TOO_LATE", message: "This reservation's time slot is over." };
    }
  }
  if (to === "NO_SHOW" && clock.nowMs < clock.startsAtMs + NO_SHOW_AFTER_MINUTES * MINUTE_MS) {
    return {
      ok: false,
      code: "TOO_EARLY",
      message: `A no-show can be recorded ${NO_SHOW_AFTER_MINUTES} minutes after the reservation starts.`,
    };
  }
  return { ok: true };
}

/** The statuses a manager can move to right now, for the action buttons. */
export function availableReservationActions(
  from: ManagedReservationStatus,
  clock: ReservationClock,
): ManagedReservationStatus[] {
  return NEXT[from].filter((to) => reservationTransition(from, to, clock).ok);
}

function label(status: ManagedReservationStatus): string {
  return status.toLowerCase().replace("_", "-");
}

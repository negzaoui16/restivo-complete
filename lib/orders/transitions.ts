/**
 * Manager-side order lifecycle, as pure rules.
 *
 *   PENDING -> CONFIRMED -> PREPARING -> READY -> DELIVERED
 *   Cancelling is possible until the order is delivered.
 *   An order cannot move forward once its reservation is cancelled or a no-show
 *   (it can still be cancelled). Orders without a reservation are unaffected.
 * No imports, so node:test runs it.
 */

export type ManagedOrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";

export type OrderTransition =
  | { ok: true }
  | { ok: false; code: "INVALID_TRANSITION" | "RESERVATION_CLOSED"; message: string };

const FORWARD: Record<ManagedOrderStatus, ManagedOrderStatus | null> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

const CANCELLABLE: readonly ManagedOrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY"];

/** Reservation statuses that stop an order from moving forward. */
const CLOSED_RESERVATION = ["CANCELLED", "NO_SHOW"];

export function orderTransition(
  from: ManagedOrderStatus,
  to: ManagedOrderStatus,
  reservationStatus: string | null,
): OrderTransition {
  if (to === "CANCELLED") {
    return CANCELLABLE.includes(from)
      ? { ok: true }
      : { ok: false, code: "INVALID_TRANSITION", message: `A ${from.toLowerCase()} order cannot be cancelled.` };
  }
  if (FORWARD[from] !== to) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `A ${from.toLowerCase()} order cannot become ${to.toLowerCase()}.`,
    };
  }
  if (reservationStatus && CLOSED_RESERVATION.includes(reservationStatus)) {
    return {
      ok: false,
      code: "RESERVATION_CLOSED",
      message: "The reservation of this order was cancelled or missed, so the order cannot move forward.",
    };
  }
  return { ok: true };
}

/** The statuses a manager can move to right now, for the action buttons. */
export function availableOrderActions(from: ManagedOrderStatus, reservationStatus: string | null): ManagedOrderStatus[] {
  const forward = FORWARD[from];
  const candidates: ManagedOrderStatus[] = forward ? [forward, "CANCELLED"] : [];
  return candidates.filter((to) => orderTransition(from, to, reservationStatus).ok);
}

/**
 * Day boundaries and dashboard counters, as pure functions.
 *
 * A "day" is the restaurant's local calendar day. Money is carried as BigInt
 * minor units (TND 12.500 = 12500n); the caller converts strings in and out.
 */
import { Temporal } from "temporal-polyfill";

export type DayBounds = { date: string; startMs: number; endMs: number };

/** Local day of `date` ("YYYY-MM-DD"), or of `nowMs` when absent; endMs is exclusive. */
export function dayBounds(date: string | null, timezone: string, nowMs: number): DayBounds {
  const day = date
    ? Temporal.PlainDate.from(date)
    : Temporal.Instant.fromEpochMilliseconds(nowMs).toZonedDateTimeISO(timezone).toPlainDate();
  return {
    date: day.toString(),
    startMs: day.toZonedDateTime(timezone).epochMilliseconds,
    endMs: day.add({ days: 1 }).toZonedDateTime(timezone).epochMilliseconds,
  };
}

export type StatsReservation = { status: string; startsAtMs: number; guestCount: number };
/** `dayMs`: the reservation's start when the order has one, else when it was placed. */
export type StatsOrder = { status: string; dayMs: number; totalMinor: bigint };

export type DashboardStats = {
  reservationsToday: number;
  coversToday: number;
  ordersToProcess: number;
  revenueTodayMinor: bigint;
};

const OPEN_ORDER = ["PENDING", "CONFIRMED", "PREPARING", "READY"];

/**
 * - reservations / covers: today's reservations that were not cancelled.
 * - orders to process: open orders for today or earlier (future pre-orders wait).
 * - revenue: today's orders that were not cancelled.
 */
export function computeStats(reservations: StatsReservation[], orders: StatsOrder[], day: DayBounds): DashboardStats {
  const today = reservations.filter(
    (row) => row.status !== "CANCELLED" && row.startsAtMs >= day.startMs && row.startsAtMs < day.endMs,
  );
  let revenue = BigInt(0);
  for (const order of orders) {
    if (order.status !== "CANCELLED" && order.dayMs >= day.startMs && order.dayMs < day.endMs) {
      revenue += order.totalMinor;
    }
  }
  return {
    reservationsToday: today.length,
    coversToday: today.reduce((sum, row) => sum + row.guestCount, 0),
    ordersToProcess: orders.filter((order) => OPEN_ORDER.includes(order.status) && order.dayMs < day.endMs).length,
    revenueTodayMinor: revenue,
  };
}

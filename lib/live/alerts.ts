/**
 * Which live alerts are due, as a pure function (no imports, so node:test runs it).
 *
 *   ARRIVING          guests not seated yet, due within 15 minutes (until their start time)
 *   NO_SHOW_POSSIBLE  guests not seated 15 minutes after the start, while the slot is still open
 *   OVERRUN           a seated party is past the end of its slot while another reservation follows
 *                     on the same table
 *
 * Every alert has a stable key (`kind:reservationId`). The caller stores it with the notification
 * and skips an alert whose key already exists, so the alerts are created once however often, and
 * from however many browsers, the live state is read.
 */

const MINUTE_MS = 60_000;

export const ARRIVING_MINUTES = 15;
/** Same delay as the no-show rule in the reservation transitions. */
export const NO_SHOW_POSSIBLE_MINUTES = 15;

export type AlertKind = "ARRIVING" | "NO_SHOW_POSSIBLE" | "OVERRUN";

export type AlertReservation = {
  id: string;
  status: string;
  startsAtMs: number;
  endsAtMs: number;
  customerName: string;
  guestCount: number;
};

export type AlertTable = {
  id: string;
  name: string;
  state: "FREE" | "RESERVED_SOON" | "OCCUPIED" | "OVERDUE";
  current: AlertReservation | null;
  next: AlertReservation | null;
};

export type DueAlert = {
  key: string;
  kind: AlertKind;
  reservationId: string;
  tableId: string;
  title: string;
  message: string;
};

const HELD_UNSEATED = new Set(["PENDING", "CONFIRMED"]);

export function alertKey(kind: AlertKind, reservationId: string): string {
  return `${kind.toLowerCase()}:${reservationId}`;
}

function guests(count: number): string {
  return `${count} ${count === 1 ? "guest" : "guests"}`;
}

function inMinutes(ms: number): string {
  const minutes = Math.ceil(ms / MINUTE_MS);
  return minutes <= 0 ? "now" : `in ${minutes} min`;
}

/** The alerts that are due right now for the given tables. */
export function dueAlerts(nowMs: number, tables: readonly AlertTable[]): DueAlert[] {
  const alerts: DueAlert[] = [];
  for (const table of tables) {
    for (const reservation of [table.current, table.next]) {
      if (!reservation || !HELD_UNSEATED.has(reservation.status)) continue;
      const untilStart = reservation.startsAtMs - nowMs;

      if (untilStart >= 0 && untilStart <= ARRIVING_MINUTES * MINUTE_MS) {
        alerts.push({
          key: alertKey("ARRIVING", reservation.id),
          kind: "ARRIVING",
          reservationId: reservation.id,
          tableId: table.id,
          title: "Guests arriving soon",
          message: `${reservation.customerName} (${guests(reservation.guestCount)}) is due ${inMinutes(untilStart)} at ${table.name}.`,
        });
      }

      const late = nowMs - reservation.startsAtMs;
      if (late >= NO_SHOW_POSSIBLE_MINUTES * MINUTE_MS && nowMs < reservation.endsAtMs) {
        alerts.push({
          key: alertKey("NO_SHOW_POSSIBLE", reservation.id),
          kind: "NO_SHOW_POSSIBLE",
          reservationId: reservation.id,
          tableId: table.id,
          title: "Possible no-show",
          message: `${reservation.customerName} is ${Math.floor(late / MINUTE_MS)} min late for ${table.name}. You can record a no-show.`,
        });
      }
    }

    const seated = table.current;
    if (table.state === "OVERDUE" && seated && seated.status === "SEATED" && table.next) {
      const over = Math.floor((nowMs - seated.endsAtMs) / MINUTE_MS);
      const waiting = table.next.startsAtMs <= nowMs;
      alerts.push({
        key: alertKey("OVERRUN", seated.id),
        kind: "OVERRUN",
        reservationId: seated.id,
        tableId: table.id,
        title: "Table over time",
        message: `${table.name} is ${over} min past its slot and ${table.next.customerName} is ${
          waiting ? "waiting" : `due ${inMinutes(table.next.startsAtMs - nowMs)}`
        }.`,
      });
    }
  }
  return alerts;
}

/**
 * Live state of the tables as pure functions (no imports, so node:test runs them).
 *
 * A reservation holds its table while it is PENDING, CONFIRMED or SEATED. Every other status
 * (COMPLETED, CANCELLED, NO_SHOW) is ignored. All times are epoch milliseconds.
 *
 *   OCCUPIED       a SEATED reservation whose slot has not ended (it ends exactly now: still occupied)
 *   OVERDUE        a SEATED reservation after the end of its slot
 *   RESERVED_SOON  a PENDING or CONFIRMED reservation that starts in less than 30 minutes, or that
 *                  started already and has not ended (the guests are late, the table stays held)
 *   FREE           nothing of the above
 *
 * `next` is the earliest held reservation that is not the current one and has not ended, so a
 * table seated now still shows the booking that follows it.
 */

export const RESERVED_SOON_MINUTES = 30;

const MINUTE_MS = 60_000;

export type LiveTableState = "FREE" | "RESERVED_SOON" | "OCCUPIED" | "OVERDUE";

export type LiveReservationInput = {
  id: string;
  tableId: string;
  status: string;
  startsAtMs: number;
  endsAtMs: number;
};

export type LiveTableResult<R extends LiveReservationInput> = {
  tableId: string;
  state: LiveTableState;
  /** The seated reservation, or the one the table is held for; null when FREE. */
  current: R | null;
  /** The next held reservation after `current`. */
  next: R | null;
};

const HELD_STATUSES = new Set(["PENDING", "CONFIRMED", "SEATED"]);

export function holdsLiveTable(status: string): boolean {
  return HELD_STATUSES.has(status);
}

function byStart<R extends LiveReservationInput>(a: R, b: R): number {
  return a.startsAtMs - b.startsAtMs || a.id.localeCompare(b.id);
}

/** The state of every given table, in the order of `tableIds`. */
export function computeLiveTables<R extends LiveReservationInput>(
  nowMs: number,
  tableIds: readonly string[],
  reservations: readonly R[],
): LiveTableResult<R>[] {
  const byTable = new Map<string, R[]>();
  for (const reservation of reservations) {
    if (!holdsLiveTable(reservation.status)) continue;
    const list = byTable.get(reservation.tableId);
    if (list) list.push(reservation);
    else byTable.set(reservation.tableId, [reservation]);
  }
  return tableIds.map((tableId) => liveTable(nowMs, tableId, (byTable.get(tableId) ?? []).sort(byStart)));
}

function liveTable<R extends LiveReservationInput>(nowMs: number, tableId: string, held: R[]): LiveTableResult<R> {
  const seated = held.find((reservation) => reservation.status === "SEATED") ?? null;
  // A SEATED reservation stays the current one even after its end; the others are only
  // relevant while their slot has not ended.
  const open = held.filter((reservation) => reservation.status === "SEATED" || reservation.endsAtMs > nowMs);

  if (seated) {
    return {
      tableId,
      state: nowMs > seated.endsAtMs ? "OVERDUE" : "OCCUPIED",
      current: seated,
      next: open.find((reservation) => reservation !== seated && reservation.status !== "SEATED") ?? null,
    };
  }

  const [first, second] = open;
  if (first && first.startsAtMs - nowMs < RESERVED_SOON_MINUTES * MINUTE_MS) {
    return { tableId, state: "RESERVED_SOON", current: first, next: second ?? null };
  }
  return { tableId, state: "FREE", current: null, next: first ?? null };
}

export type SlotTimer = {
  /** Whole minutes since the slot began; 0 before it starts. */
  elapsedMinutes: number;
  /** Whole minutes left, rounded up; negative once the slot is over (how late it is). */
  remainingMinutes: number;
  /** Minutes before the slot starts, rounded up; 0 once it has started. */
  startsInMinutes: number;
};

/** Elapsed and remaining time of a slot. The caller passes the server's "now". */
export function slotTimer(nowMs: number, startsAtMs: number, endsAtMs: number): SlotTimer {
  return {
    elapsedMinutes: Math.max(0, Math.floor((nowMs - startsAtMs) / MINUTE_MS)),
    remainingMinutes: nowMs <= endsAtMs ? Math.ceil((endsAtMs - nowMs) / MINUTE_MS) : -Math.ceil((nowMs - endsAtMs) / MINUTE_MS),
    startsInMinutes: Math.max(0, Math.ceil((startsAtMs - nowMs) / MINUTE_MS)),
  };
}

export type LiveDisplayKind = LiveTableState | "WAITING";

export const LIVE_LABELS: Record<LiveTableState, string> = {
  FREE: "Free",
  RESERVED_SOON: "Reserved soon",
  OCCUPIED: "Occupied",
  OVERDUE: "Overdue",
};

export type LiveDisplay = { kind: LiveDisplayKind; label: string; minutesLate: number };

/**
 * What the screen shows for a table. A held reservation whose slot has started but whose guests
 * are not seated yet is "Waiting · N min late", not "Reserved soon". Display only: the state
 * above (and the 15 minutes before a no-show is allowed) are decided elsewhere.
 */
export function liveDisplay(
  state: LiveTableState,
  current: { status: string; startsAtMs: number } | null,
  nowMs: number,
): LiveDisplay {
  if (state === "RESERVED_SOON" && current && current.status !== "SEATED" && current.startsAtMs <= nowMs) {
    const minutesLate = Math.floor((nowMs - current.startsAtMs) / MINUTE_MS);
    return { kind: "WAITING", label: `Waiting · ${minutesLate} min late`, minutesLate };
  }
  return { kind: state, label: LIVE_LABELS[state], minutesLate: 0 };
}

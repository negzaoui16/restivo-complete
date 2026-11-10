/**
 * What the AI tools return about reservations and tables, as pure functions (no "@/" imports, so
 * node:test runs them). The model gets local times and short names, never ids, codes or money.
 */
type LiveTableState = "FREE" | "RESERVED_SOON" | "OCCUPIED" | "OVERDUE";

function localTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

type ReservationRow = {
  status: string;
  startsAt: string;
  endsAt: string;
  guestCount: number;
  notes: string | null;
  table: { name: string };
  customer: { name: string };
  orders: { status: string }[];
};

export type ReservationListInput = { timezone: string; from: string; to: string; reservations: ReservationRow[] };

export function shapeReservations(list: ReservationListInput, limit: number) {
  const rows = list.reservations;
  return {
    from: list.from,
    to: list.to,
    timezone: list.timezone,
    count: rows.length,
    limit,
    truncated: rows.length > limit,
    reservations: rows.slice(0, limit).map((row) => ({
      from: localTime(row.startsAt, list.timezone),
      until: localTime(row.endsAt, list.timezone),
      table: row.table.name,
      guests: row.guestCount,
      status: row.status,
      customer: row.customer.name,
      notes: row.notes,
      preOrders: row.orders.filter((order) => order.status !== "CANCELLED").length,
    })),
  };
}

type LiveReservationRow = { status: string; startsAt: string; endsAt: string; guestCount: number; customerName: string };

export type LiveInput = {
  now: string;
  timezone: string;
  floors: { id: string; name: string }[];
  tables: {
    name: string;
    floorId: string;
    capacity: number;
    state: LiveTableState;
    current: LiveReservationRow | null;
    next: LiveReservationRow | null;
  }[];
};

const STATE_ORDER: LiveTableState[] = ["FREE", "RESERVED_SOON", "OCCUPIED", "OVERDUE"];

/** `statusOf` gives the wording shown on screen for a table ("Waiting · 7 min late"); the service passes liveDisplay. */
export function shapeTables(live: LiveInput, limit: number, statusOf: (table: LiveInput["tables"][number]) => string) {
  const floorName = new Map(live.floors.map((floor) => [floor.id, floor.name]));
  const counts = Object.fromEntries(STATE_ORDER.map((state) => [state, 0])) as Record<LiveTableState, number>;
  for (const table of live.tables) counts[table.state] += 1;

  return {
    now: localTime(live.now, live.timezone),
    timezone: live.timezone,
    tableCount: live.tables.length,
    counts,
    limit,
    truncated: live.tables.length > limit,
    tables: live.tables.slice(0, limit).map((table) => ({
      name: table.name,
      floor: floorName.get(table.floorId) ?? "",
      seats: table.capacity,
      status: statusOf(table),
      current: table.current
        ? {
            customer: table.current.customerName,
            guests: table.current.guestCount,
            from: localTime(table.current.startsAt, live.timezone),
            until: localTime(table.current.endsAt, live.timezone),
            reservationStatus: table.current.status,
          }
        : null,
      next: table.next
        ? { customer: table.next.customerName, guests: table.next.guestCount, at: localTime(table.next.startsAt, live.timezone) }
        : null,
    })),
  };
}

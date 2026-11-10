/**
 * Live state of the tables of the active floors: one request, a fixed number of queries
 * (restaurant, floors, one table query per active floor, three reservation queries, then
 * one profile lookup per distinct guest).
 */
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { nameLookup } from "@/lib/manager/service";
import { ReservationError } from "@/lib/reservations/errors";
import { availableReservationActions, type ManagedReservationStatus } from "@/lib/reservations/transitions";
import { syncLiveAlerts } from "./alerts-service";
import { computeLiveTables } from "./state";
import type { LiveAction, LiveReservation, LiveState, LiveTable } from "./types";

const HELD_STATUSES = ["PENDING", "CONFIRMED", "SEATED"] as const;
const LIVE_ACTIONS: readonly LiveAction[] = ["SEATED", "COMPLETED", "NO_SHOW"];
/** Bookings further away than this never change the state of a table. */
const HORIZON_MS = 24 * 60 * 60 * 1000;

function toMs(value: unknown): number {
  return Temporal.Instant.from(String(value)).epochMilliseconds;
}

export async function getLiveState(restaurantId: string, options: { alerts?: boolean } = {}): Promise<LiveState> {
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  if (!restaurant) throw new ReservationError("NOT_FOUND", "Restaurant not found.");

  const nowMs = Date.now();
  const floors = (await db.orm.public.Floor.where({ restaurantId }).all())
    .filter((floor) => floor.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const [tableGroups, reservationGroups] = await Promise.all([
    Promise.all(floors.map((floor) => db.orm.public.Table.where({ floorId: floor.id, isActive: true }).all())),
    Promise.all(HELD_STATUSES.map((status) => db.orm.public.Reservation.where({ restaurantId, status }).all())),
  ]);

  const tables = floors.flatMap((floor, index) =>
    tableGroups[index].map((table) => ({ id: table.id, name: table.name, floorId: floor.id, capacity: table.capacity })),
  );
  const onFloor = new Set(tables.map((table) => table.id));

  // Seated guests always count; the others only while their slot is ahead and within the horizon.
  const rows = reservationGroups
    .flat()
    .filter((row) => onFloor.has(row.tableId))
    .filter((row) => row.status === "SEATED" || (toMs(row.endsAt) > nowMs && toMs(row.startsAt) < nowMs + HORIZON_MS))
    .map((row) => ({
      row,
      id: row.id,
      tableId: row.tableId,
      status: row.status,
      startsAtMs: toMs(row.startsAt),
      endsAtMs: toMs(row.endsAt),
    }));

  const states = computeLiveTables(nowMs, tables.map((table) => table.id), rows);

  const names = nameLookup();
  const shown = new Map<string, LiveReservation>();
  async function present(item: (typeof rows)[number] | null): Promise<LiveReservation | null> {
    if (!item) return null;
    const cached = shown.get(item.id);
    if (cached) return cached;
    const status = item.status as ManagedReservationStatus;
    const actions = availableReservationActions(status, {
      nowMs,
      startsAtMs: item.startsAtMs,
      endsAtMs: item.endsAtMs,
    }).filter((to): to is LiveAction => (LIVE_ACTIONS as readonly string[]).includes(to));
    const built: LiveReservation = {
      id: item.id,
      code: item.row.reservationCode,
      status,
      startsAt: Temporal.Instant.fromEpochMilliseconds(item.startsAtMs).toString(),
      endsAt: Temporal.Instant.fromEpochMilliseconds(item.endsAtMs).toString(),
      guestCount: item.row.guestCount,
      notes: item.row.notes,
      customerName: await names(item.row.customerId),
      actions,
    };
    shown.set(item.id, built);
    return built;
  }

  const result: LiveTable[] = [];
  for (const [index, table] of tables.entries()) {
    const state = states[index];
    result.push({
      ...table,
      state: state.state,
      current: await present(state.current),
      next: await present(state.next),
    });
  }

  // The alerts are written when the live state is read; a failure here must not hide the floor.
  if (options.alerts !== false) {
    await syncLiveAlerts(restaurantId, nowMs, result).catch((err) => console.error("[live] alerts failed:", err));
  }

  return {
    now: Temporal.Instant.fromEpochMilliseconds(nowMs).toString(),
    timezone: restaurant.timezone,
    floors: floors.map((floor) => ({ id: floor.id, name: floor.name })),
    tables: result,
  };
}

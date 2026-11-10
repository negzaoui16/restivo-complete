/**
 * Customer reservations: availability, booking, listing and cancellation.
 *
 * Double-booking protection: every booking of a table runs in a transaction
 * that first takes a PostgreSQL advisory lock keyed on that table. Concurrent
 * bookings of the same table queue behind the lock, then re-read the table's
 * reservations, so only one of two identical requests can succeed. The lock is
 * released automatically when the transaction ends.
 */
import { Temporal } from "temporal-polyfill";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { listBookableTables } from "@/lib/discover/service";
import { advisoryXactLock } from "@/lib/locks";
import { cancelledByRestaurant } from "@/lib/manager/cancellation";
import { CASCADE_CANCEL_STATUSES } from "@/lib/orders/constants";
import {
  BLOCKING_STATUSES,
  CANCELLABLE_STATUSES,
  EDITABLE_STATUSES,
  MAX_DAYS_AHEAD,
  MIN_LEAD_MINUTES,
  SLOT_DURATION_MINUTES,
} from "./constants";
import { ReservationError } from "./errors";
import {
  bookingLockKeys,
  canCancel,
  fitsBusinessHours,
  fitsCapacity,
  hasConflict,
  leadTimeIssue,
  makeReservationCode,
  ownsReservation,
  parseSlot,
  type HoursDay,
  type Interval,
  type Slot,
} from "./rules";
import type { Availability, PublicReservation, ReservationStatus } from "./types";
import type { CreateReservationBody, UpdateReservationBody } from "./validation";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const LEAD_MESSAGES = {
  TOO_SOON: `Reservations must be made at least ${MIN_LEAD_MINUTES} minutes ahead.`,
  TOO_FAR: `Reservations can be made up to ${MAX_DAYS_AHEAD} days ahead.`,
} as const;

const HOURS_MESSAGE = "The whole reservation must fit within the opening hours.";

const CODE_ATTEMPTS = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toInstant(value: unknown): Temporal.Instant {
  return Temporal.Instant.from(String(value));
}

function toInterval(row: { startsAt: unknown; endsAt: unknown }): Interval {
  return {
    startsAtMs: toInstant(row.startsAt).epochMilliseconds,
    endsAtMs: toInstant(row.endsAt).epochMilliseconds,
  };
}

function isBlocking(status: string): boolean {
  return (BLOCKING_STATUSES as readonly string[]).includes(status);
}

async function loadActiveRestaurant(restaurantId: string) {
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  if (!restaurant || restaurant.status !== "ACTIVE") {
    throw new ReservationError("NOT_FOUND", "Restaurant not found.");
  }
  return restaurant;
}

async function loadHours(restaurantId: string): Promise<HoursDay[]> {
  const rows = await db.orm.public.BusinessHours.where({ restaurantId }).all();
  return rows.map((row) => ({
    dayOfWeek: row.dayOfWeek,
    isClosed: row.isClosed,
    openTime: row.openTime,
    closeTime: row.closeTime,
  }));
}

/** Why a slot cannot be booked at all, or null when date and time are acceptable. */
function slotIssue(slot: Slot, hours: HoursDay[], now: Temporal.Instant) {
  const lead = leadTimeIssue(slot, now, MIN_LEAD_MINUTES, MAX_DAYS_AHEAD);
  if (lead) return { code: lead, message: LEAD_MESSAGES[lead] };
  if (!fitsBusinessHours(hours, slot, SLOT_DURATION_MINUTES)) {
    return { code: "OUTSIDE_HOURS" as const, message: HOURS_MESSAGE };
  }
  return null;
}

function readSlot(date: string, time: string, timezone: string): Slot {
  const parsed = parseSlot(date, time, timezone, SLOT_DURATION_MINUTES);
  if (!parsed.ok) throw new ReservationError("VALIDATION_ERROR", parsed.message);
  return parsed.slot;
}

async function writeAudit(
  userId: string,
  restaurantId: string,
  action: "CREATE" | "STATUS_CHANGE",
  reservationId: string,
  metadata: Record<string, unknown>,
) {
  await db.orm.public.AuditLog.create({
    userId,
    restaurantId,
    action,
    entityType: "Reservation",
    entityId: reservationId,
    metadata: JSON.parse(JSON.stringify(metadata)),
  });
}

// ─── Availability ─────────────────────────────────────────────────────────────

export async function getAvailability(
  restaurantId: string,
  date: string,
  time: string,
  guests?: number,
  /** While changing a reservation, its own current slot does not count as taken. */
  ignore?: { reservationId: string; userId: string },
): Promise<Availability> {
  const restaurant = await loadActiveRestaurant(restaurantId);
  const slot = readSlot(date, time, restaurant.timezone);
  const issue = slotIssue(slot, await loadHours(restaurant.id), Temporal.Now.instant());

  const base = {
    slot: {
      startsAt: slot.startsAt.toString(),
      endsAt: slot.endsAt.toString(),
      durationMinutes: SLOT_DURATION_MINUTES,
    },
    issue,
  };
  if (issue) return { ...base, tables: [] };

  const candidate: Interval = {
    startsAtMs: slot.startsAt.epochMilliseconds,
    endsAtMs: slot.endsAt.epochMilliseconds,
  };
  const [tables, reservations] = await Promise.all([
    listBookableTables(restaurant.id),
    db.orm.public.Reservation.where({ restaurantId: restaurant.id }).all(),
  ]);
  const taken = new Set(
    reservations
      .filter((row) => !(ignore && row.id === ignore.reservationId && row.customerId === ignore.userId))
      .filter((row) => isBlocking(row.status) && hasConflict([toInterval(row)], candidate))
      .map((row) => row.tableId),
  );

  return {
    ...base,
    tables: tables.map((table) => ({
      tableId: table.id,
      state: taken.has(table.id)
        ? ("taken" as const)
        : guests !== undefined && !fitsCapacity(guests, table.capacity)
          ? ("too_small" as const)
          : ("free" as const),
    })),
  };
}

// ─── Booking ──────────────────────────────────────────────────────────────────

async function freshCode(tx: Tx): Promise<string> {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = makeReservationCode((max) => randomInt(max));
    const clash = await tx.orm.public.Reservation.where({ reservationCode: code }).first();
    if (!clash) return code;
  }
  throw new ReservationError("INTERNAL_ERROR");
}

export type PreparedBooking = Awaited<ReturnType<typeof prepareBooking>>;

/** Every check that does not need the table lock: restaurant, table, slot, hours, capacity. */
export async function prepareBooking(input: CreateReservationBody) {
  const restaurant = await loadActiveRestaurant(input.restaurantId);

  const table = await db.orm.public.Table.where({ id: input.tableId }).first();
  const floor = table ? await db.orm.public.Floor.where({ id: table.floorId }).first() : null;
  if (!table || !floor || !table.isActive || !floor.isActive || floor.restaurantId !== restaurant.id) {
    throw new ReservationError("NOT_FOUND", "Table not found.");
  }

  const slot = readSlot(input.date, input.time, restaurant.timezone);
  const issue = slotIssue(slot, await loadHours(restaurant.id), Temporal.Now.instant());
  if (issue) throw new ReservationError(issue.code, issue.message);

  if (!fitsCapacity(input.guestCount, table.capacity, table.minCapacity)) {
    throw new ReservationError(
      "TABLE_TOO_SMALL",
      `This table seats up to ${table.capacity} guests.`,
    );
  }

  const candidate: Interval = {
    startsAtMs: slot.startsAt.epochMilliseconds,
    endsAtMs: slot.endsAt.epochMilliseconds,
  };

  return { restaurant, table, slot, candidate };
}

/** Takes the table lock, re-reads the table's reservations and inserts, all inside `tx`. */
export async function insertReservation(
  tx: Tx,
  userId: string,
  prepared: PreparedBooking,
  input: CreateReservationBody,
) {
  const { restaurant, table, slot, candidate } = prepared;
  await advisoryXactLock(tx, `reservation-table:${table.id}`);

  const existing = await tx.orm.public.Reservation.where({ tableId: table.id }).all();
  const blocking = existing.filter((row) => isBlocking(row.status)).map(toInterval);
  if (hasConflict(blocking, candidate)) throw new ReservationError("SLOT_TAKEN");

  return tx.orm.public.Reservation.create({
    reservationCode: await freshCode(tx),
    restaurantId: restaurant.id,
    customerId: userId,
    tableId: table.id,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    guestCount: input.guestCount,
    status: "CONFIRMED",
    notes: input.notes ? input.notes : null,
  });
}

export function bookingAuditMetadata(prepared: PreparedBooking, guestCount: number) {
  return {
    tableId: prepared.table.id,
    guestCount,
    startsAt: prepared.slot.startsAt.toString(),
  };
}

/** Same shape as the audit entry of a plain booking, written inside `tx`. */
export async function writeBookingAuditIn(
  tx: Tx,
  userId: string,
  restaurantId: string,
  reservationId: string,
  metadata: Record<string, unknown>,
) {
  await tx.orm.public.AuditLog.create({
    userId,
    restaurantId,
    action: "CREATE",
    entityType: "Reservation",
    entityId: reservationId,
    metadata: JSON.parse(JSON.stringify(metadata)),
  });
}

export function toPublicReservation(
  row: ReservationRow,
  prepared: PreparedBooking,
): PublicReservation {
  return toPublic(row, prepared.restaurant, prepared.table, Date.now());
}

export async function createReservation(userId: string, input: CreateReservationBody): Promise<PublicReservation> {
  const prepared = await prepareBooking(input);
  const created = await db.transaction((tx) => insertReservation(tx, userId, prepared, input));

  await writeAudit(userId, prepared.restaurant.id, "CREATE", created.id, bookingAuditMetadata(prepared, input.guestCount));

  return toPublic(created, prepared.restaurant, prepared.table, Date.now());
}

// ─── Listing and cancellation ─────────────────────────────────────────────────

type ReservationRow = {
  id: string;
  reservationCode: string;
  status: string;
  startsAt: unknown;
  endsAt: unknown;
  guestCount: number;
  notes: string | null;
};

function toPublic(
  row: ReservationRow,
  restaurant: { id: string; name: string; city: string | null; timezone: string },
  table: { id: string; name: string },
  nowMs: number,
): PublicReservation {
  const startsAt = toInstant(row.startsAt);
  return {
    id: row.id,
    code: row.reservationCode,
    status: row.status as ReservationStatus,
    startsAt: startsAt.toString(),
    endsAt: toInstant(row.endsAt).toString(),
    guestCount: row.guestCount,
    notes: row.notes,
    restaurant: { id: restaurant.id, name: restaurant.name, city: restaurant.city, timezone: restaurant.timezone },
    table: { id: table.id, name: table.name },
    canCancel: canCancel(row.status, startsAt.epochMilliseconds, nowMs, CANCELLABLE_STATUSES),
    cancelledByRestaurant: false,
    review: null,
  };
}

export async function listMyReservations(userId: string): Promise<PublicReservation[]> {
  const rows = await db.orm.public.Reservation.where({ customerId: userId }).all();
  const restaurants = new Map<string, Awaited<ReturnType<typeof loadRestaurantRow>>>();
  const tables = new Map<string, Awaited<ReturnType<typeof loadTableRow>>>();
  const nowMs = Date.now();

  // One query for all the customer's reviews, then a lookup per reservation.
  const reviews = await db.orm.public.Review.where({ customerId: userId }).all();
  const ratingByReservation = new Map(reviews.map((review) => [review.reservationId, review.rating]));

  const result: PublicReservation[] = [];
  for (const row of rows) {
    if (!restaurants.has(row.restaurantId)) restaurants.set(row.restaurantId, await loadRestaurantRow(row.restaurantId));
    if (!tables.has(row.tableId)) tables.set(row.tableId, await loadTableRow(row.tableId));
    const restaurant = restaurants.get(row.restaurantId);
    const table = tables.get(row.tableId);
    if (!restaurant || !table) continue;
    const item = toPublic(row, restaurant, table, nowMs);
    if (row.status === "CANCELLED") item.cancelledByRestaurant = await cancelledByRestaurant("Reservation", row.id, userId);
    const rating = ratingByReservation.get(row.id);
    if (rating !== undefined) item.review = { rating };
    result.push(item);
  }

  return result.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function loadRestaurantRow(id: string) {
  return db.orm.public.Restaurant.where({ id }).first();
}

function loadTableRow(id: string) {
  return db.orm.public.Table.where({ id }).first();
}

export type CancelResult = {
  reservation: PublicReservation;
  /** Pre-orders (PENDING or CONFIRMED) cancelled together with the reservation. */
  cancelledOrders: number;
};

export async function cancelReservation(userId: string, reservationId: string): Promise<CancelResult> {
  // Same lock key as order creation: an order cannot be added while this runs,
  // and the reservation status and its pre-orders change in one transaction.
  const { row, cancelledOrderIds } = await db.transaction(async (tx) => {
    await advisoryXactLock(tx, `reservation:${reservationId}`);

    const current = await tx.orm.public.Reservation.where({ id: reservationId }).first();
    if (!current) throw new ReservationError("NOT_FOUND", "Reservation not found.");
    if (!ownsReservation(userId, current.customerId)) throw new ReservationError("FORBIDDEN");

    const startsAtMs = toInstant(current.startsAt).epochMilliseconds;
    if (!canCancel(current.status, startsAtMs, Date.now(), CANCELLABLE_STATUSES)) {
      throw new ReservationError("NOT_CANCELLABLE");
    }

    await tx.orm.public.Reservation.where({ id: current.id }).update({ status: "CANCELLED" });

    const orders = await tx.orm.public.Order.where({ reservationId: current.id }).all();
    const cancelling = orders.filter((order) => (CASCADE_CANCEL_STATUSES as readonly string[]).includes(order.status));
    for (const order of cancelling) {
      await tx.orm.public.Order.where({ id: order.id }).update({ status: "CANCELLED" });
    }

    await tx.orm.public.AuditLog.create({
      userId,
      restaurantId: current.restaurantId,
      action: "STATUS_CHANGE",
      entityType: "Reservation",
      entityId: current.id,
      metadata: JSON.parse(
        JSON.stringify({ from: current.status, to: "CANCELLED", cancelledOrders: cancelling.map((order) => order.id) }),
      ),
    });

    return { row: current, cancelledOrderIds: cancelling.map((order) => order.id) };
  });

  const [restaurant, table] = await Promise.all([loadRestaurantRow(row.restaurantId), loadTableRow(row.tableId)]);
  if (!restaurant || !table) throw new ReservationError("NOT_FOUND", "Reservation not found.");
  return {
    reservation: toPublic({ ...row, status: "CANCELLED" }, restaurant, table, Date.now()),
    cancelledOrders: cancelledOrderIds.length,
  };
}

/**
 * Changes the date, time, table, guests or notes of an upcoming reservation, with exactly
 * the rules of a new booking (hours including after midnight, capacity, lead time, overlap).
 * The reservation keeps its code and its pre-orders. The locks of the reservation and of both
 * tables are taken in one fixed order, so two changes cannot wait on each other.
 */
export async function updateReservation(
  userId: string,
  reservationId: string,
  input: UpdateReservationBody,
): Promise<PublicReservation> {
  const current = await db.orm.public.Reservation.where({ id: reservationId }).first();
  if (!current) throw new ReservationError("NOT_FOUND", "Reservation not found.");
  if (!ownsReservation(userId, current.customerId)) throw new ReservationError("FORBIDDEN");
  if (!canCancel(current.status, toInstant(current.startsAt).epochMilliseconds, Date.now(), EDITABLE_STATUSES)) {
    throw new ReservationError("NOT_MODIFIABLE");
  }

  const notes = input.notes === undefined ? (current.notes ?? undefined) : input.notes;
  const prepared = await prepareBooking({
    restaurantId: current.restaurantId,
    tableId: input.tableId,
    date: input.date,
    time: input.time,
    guestCount: input.guestCount,
    ...(notes ? { notes } : {}),
  });

  await db.transaction(async (tx) => {
    for (const key of bookingLockKeys(reservationId, current.tableId, prepared.table.id)) {
      await advisoryXactLock(tx, key);
    }

    const fresh = await tx.orm.public.Reservation.where({ id: reservationId }).first();
    if (!fresh) throw new ReservationError("NOT_FOUND", "Reservation not found.");
    if (!canCancel(fresh.status, toInstant(fresh.startsAt).epochMilliseconds, Date.now(), EDITABLE_STATUSES)) {
      throw new ReservationError("NOT_MODIFIABLE");
    }

    const others = (await tx.orm.public.Reservation.where({ tableId: prepared.table.id }).all())
      .filter((row) => row.id !== reservationId && isBlocking(row.status))
      .map(toInterval);
    if (hasConflict(others, prepared.candidate)) throw new ReservationError("SLOT_TAKEN");

    await tx.orm.public.Reservation.where({ id: reservationId }).update({
      tableId: prepared.table.id,
      startsAt: prepared.slot.startsAt,
      endsAt: prepared.slot.endsAt,
      guestCount: input.guestCount,
      notes: notes ? notes : null,
    });

    // The pre-orders stay linked and follow the table.
    if (fresh.tableId !== prepared.table.id) {
      for (const order of await tx.orm.public.Order.where({ reservationId }).all()) {
        await tx.orm.public.Order.where({ id: order.id }).update({ tableId: prepared.table.id });
      }
    }

    const changed = [
      fresh.tableId !== prepared.table.id ? "table" : null,
      toInstant(fresh.startsAt).epochMilliseconds !== prepared.slot.startsAt.epochMilliseconds ? "time" : null,
      fresh.guestCount !== input.guestCount ? "guests" : null,
      (fresh.notes ?? "") !== (notes ?? "") ? "notes" : null,
    ].filter(Boolean);
    await tx.orm.public.AuditLog.create({
      userId,
      restaurantId: fresh.restaurantId,
      action: "UPDATE",
      entityType: "Reservation",
      entityId: reservationId,
      metadata: JSON.parse(
        JSON.stringify({
          fields: changed,
          from: { tableId: fresh.tableId, startsAt: toInstant(fresh.startsAt).toString() },
          to: { tableId: prepared.table.id, startsAt: prepared.slot.startsAt.toString() },
        }),
      ),
    });
  });

  const [row, restaurant, table] = await Promise.all([
    loadReservationRow(reservationId),
    loadRestaurantRow(current.restaurantId),
    loadTableRow(prepared.table.id),
  ]);
  if (!row || !restaurant || !table) throw new ReservationError("NOT_FOUND", "Reservation not found.");
  return toPublic(row, restaurant, table, Date.now());
}

function loadReservationRow(id: string) {
  return db.orm.public.Reservation.where({ id }).first();
}

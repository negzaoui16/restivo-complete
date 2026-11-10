/**
 * Manager side of reservations and pre-orders: lists, status changes, dashboard stats.
 *
 * Every status change runs in one transaction that first takes the same
 * advisory lock as the customer's cancellation and order creation
 * (`reservation:<id>`), re-reads the row, checks the pure transition rules,
 * writes the AuditLog entry and the customer's Notification. Access control
 * (owner or manager of THIS restaurant) is done by the routes.
 */
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { advisoryXactLock } from "@/lib/locks";
import { createNotificationIn } from "@/lib/notifications/service";
import { CASCADE_CANCEL_STATUSES } from "@/lib/orders/constants";
import { currencyDecimals, formatMinor, parseDecimal } from "@/lib/orders/pricing";
import { availableOrderActions, orderTransition, type ManagedOrderStatus } from "@/lib/orders/transitions";
import { ReservationError } from "@/lib/reservations/errors";
import { computeStats, dayBounds, type DayBounds } from "@/lib/reservations/stats";
import {
  availableReservationActions,
  reservationTransition,
  type ManagedReservationStatus,
  type ReservationClock,
} from "@/lib/reservations/transitions";
import type {
  ActivityItem,
  ManagerOrder,
  ManagerOrderList,
  ManagerReservation,
  ManagerReservationList,
  ManagerStats,
  ReservationChange,
} from "./types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ReservationRow = NonNullable<Awaited<ReturnType<typeof loadReservationRow>>>;
type OrderRow = NonNullable<Awaited<ReturnType<typeof loadOrderRow>>>;

const MAX_RANGE_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMs(value: unknown): number {
  return Temporal.Instant.from(String(value)).epochMilliseconds;
}

function toIso(value: unknown): string {
  return Temporal.Instant.from(String(value)).toString();
}

function loadReservationRow(id: string) {
  return db.orm.public.Reservation.where({ id }).first();
}

function loadOrderRow(id: string) {
  return db.orm.public.Order.where({ id }).first();
}

async function loadRestaurant(restaurantId: string) {
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  if (!restaurant) throw new ReservationError("NOT_FOUND", "Restaurant not found.");
  return {
    id: restaurant.id,
    name: restaurant.name,
    timezone: restaurant.timezone,
    currency: restaurant.currency,
    decimals: currencyDecimals(restaurant.currency),
  };
}

type Restaurant = Awaited<ReturnType<typeof loadRestaurant>>;

/** Display names, looked up once per person. */
export function nameLookup() {
  const cache = new Map<string, string>();
  return async (userId: string): Promise<string> => {
    const cached = cache.get(userId);
    if (cached) return cached;
    const profile = await db.orm.public.Profile.where({ userId }).first();
    const full = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
    const name = profile?.displayName || full || "Guest";
    cache.set(userId, name);
    return name;
  };
}

function tableLookup() {
  const cache = new Map<string, string>();
  return async (tableId: string | null): Promise<string> => {
    if (!tableId) return "";
    const cached = cache.get(tableId);
    if (cached !== undefined) return cached;
    const table = await db.orm.public.Table.where({ id: tableId }).first();
    const name = table?.name ?? "";
    cache.set(tableId, name);
    return name;
  };
}

function money(value: unknown, decimals: number): string {
  return formatMinor(parseDecimal(String(value ?? "0"), decimals), decimals);
}

function clockOf(row: { startsAt: unknown; endsAt: unknown }, nowMs: number): ReservationClock {
  return { nowMs, startsAtMs: toMs(row.startsAt), endsAtMs: toMs(row.endsAt) };
}

/** "24 Oct, 19:00" in the restaurant's time zone. */
function whenText(ms: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

// ─── Views ────────────────────────────────────────────────────────────────────

async function buildReservation(
  row: ReservationRow,
  restaurant: Restaurant,
  names: ReturnType<typeof nameLookup>,
  tables: ReturnType<typeof tableLookup>,
  orders: { id: string; status: string; total: unknown }[],
  nowMs: number,
): Promise<ManagerReservation> {
  const status = row.status as ManagedReservationStatus;
  const kept = orders.filter((order) => order.status !== "CANCELLED");
  const totalMinor = kept.reduce((sum, order) => sum + parseDecimal(String(order.total), restaurant.decimals), BigInt(0));
  return {
    id: row.id,
    code: row.reservationCode,
    status,
    startsAt: toIso(row.startsAt),
    endsAt: toIso(row.endsAt),
    guestCount: row.guestCount,
    notes: row.notes,
    table: { id: row.tableId, name: await tables(row.tableId) },
    customer: { id: row.customerId, name: await names(row.customerId) },
    orders: orders.map((order) => ({
      id: order.id,
      status: order.status as ManagedOrderStatus,
      total: money(order.total, restaurant.decimals),
    })),
    ordersTotal: formatMinor(totalMinor, restaurant.decimals),
    actions: availableReservationActions(status, clockOf(row, nowMs)),
  };
}

async function buildOrder(
  row: OrderRow,
  restaurant: Restaurant,
  names: ReturnType<typeof nameLookup>,
  tables: ReturnType<typeof tableLookup>,
  reservation: ReservationRow | null,
): Promise<ManagerOrder> {
  const items = await db.orm.public.OrderItem.where({ orderId: row.id }).all();
  const decimals = restaurant.decimals;
  return {
    id: row.id,
    status: row.status as ManagedOrderStatus,
    createdAt: toIso(row.createdAt),
    notes: row.notes,
    currency: restaurant.currency,
    subtotal: money(row.subtotal, decimals),
    discount: money(row.discount, decimals),
    total: money(row.total, decimals),
    items: items.map((item) => ({
      id: item.id,
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitPrice: money(item.priceSnapshot, decimals),
      notes: item.notes,
    })),
    customer: { id: row.customerId, name: await names(row.customerId) },
    reservation: reservation
      ? {
          id: reservation.id,
          code: reservation.reservationCode,
          status: reservation.status as ManagedReservationStatus,
          startsAt: toIso(reservation.startsAt),
          tableName: await tables(reservation.tableId),
        }
      : null,
    actions: availableOrderActions(row.status as ManagedOrderStatus, reservation?.status ?? null),
  };
}

// ─── Lists ────────────────────────────────────────────────────────────────────

export type ReservationQuery = { date?: string; from?: string; to?: string; status?: string[] };

export async function listReservations(restaurantId: string, query: ReservationQuery): Promise<ManagerReservationList> {
  const restaurant = await loadRestaurant(restaurantId);
  const nowMs = Date.now();
  const first = dayBounds(query.date ?? query.from ?? null, restaurant.timezone, nowMs);
  const last = query.date || !query.to ? first : dayBounds(query.to, restaurant.timezone, nowMs);
  if (last.endMs - first.startMs > MAX_RANGE_DAYS * DAY_MS) {
    throw new ReservationError("VALIDATION_ERROR", `Choose a range of at most ${MAX_RANGE_DAYS} days.`);
  }

  const [rows, orders] = await Promise.all([
    db.orm.public.Reservation.where({ restaurantId }).all(),
    db.orm.public.Order.where({ restaurantId }).all(),
  ]);
  const wanted = query.status && query.status.length > 0 ? new Set(query.status) : null;
  const inRange = rows
    .filter((row) => {
      const startsAtMs = toMs(row.startsAt);
      return startsAtMs >= first.startMs && startsAtMs < last.endMs && (!wanted || wanted.has(row.status));
    })
    .sort((a, b) => toMs(a.startsAt) - toMs(b.startsAt));

  const names = nameLookup();
  const tables = tableLookup();
  const reservations: ManagerReservation[] = [];
  for (const row of inRange) {
    const linked = orders.filter((order) => order.reservationId === row.id);
    reservations.push(await buildReservation(row, restaurant, names, tables, linked, nowMs));
  }
  return { timezone: restaurant.timezone, currency: restaurant.currency, from: first.date, to: last.date, reservations };
}

export type OrderQuery = { status?: string[]; reservationId?: string; date?: string };

export async function listOrders(restaurantId: string, query: OrderQuery): Promise<ManagerOrderList> {
  const restaurant = await loadRestaurant(restaurantId);
  const day: DayBounds | null = query.date
    ? dayBounds(query.date === "today" ? null : query.date, restaurant.timezone, Date.now())
    : null;

  const [rows, reservationRows] = await Promise.all([
    db.orm.public.Order.where({ restaurantId }).all(),
    db.orm.public.Reservation.where({ restaurantId }).all(),
  ]);
  const reservationById = new Map(reservationRows.map((row) => [row.id, row]));
  const wanted = query.status && query.status.length > 0 ? new Set(query.status) : null;
  const orderDay = (row: (typeof rows)[number]) => {
    const reservation = row.reservationId ? reservationById.get(row.reservationId) : undefined;
    return reservation ? toMs(reservation.startsAt) : toMs(row.createdAt);
  };

  const selected = rows
    .filter((row) => !wanted || wanted.has(row.status))
    .filter((row) => !query.reservationId || row.reservationId === query.reservationId)
    .filter((row) => !day || (orderDay(row) >= day.startMs && orderDay(row) < day.endMs))
    .sort((a, b) => orderDay(a) - orderDay(b) || toMs(a.createdAt) - toMs(b.createdAt));

  const names = nameLookup();
  const tables = tableLookup();
  const orders: ManagerOrder[] = [];
  for (const row of selected) {
    const reservation = row.reservationId ? (reservationById.get(row.reservationId) ?? null) : null;
    orders.push(await buildOrder(row, restaurant, names, tables, reservation));
  }
  return { timezone: restaurant.timezone, currency: restaurant.currency, date: day?.date ?? null, orders };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats(restaurantId: string, date?: string): Promise<ManagerStats> {
  const restaurant = await loadRestaurant(restaurantId);
  const day = dayBounds(date ?? null, restaurant.timezone, Date.now());
  const [reservations, orders] = await Promise.all([
    db.orm.public.Reservation.where({ restaurantId }).all(),
    db.orm.public.Order.where({ restaurantId }).all(),
  ]);
  const startOf = new Map(reservations.map((row) => [row.id, toMs(row.startsAt)]));

  const stats = computeStats(
    reservations.map((row) => ({ status: row.status, startsAtMs: toMs(row.startsAt), guestCount: row.guestCount })),
    orders.map((row) => ({
      status: row.status,
      dayMs: (row.reservationId ? startOf.get(row.reservationId) : undefined) ?? toMs(row.createdAt),
      totalMinor: parseDecimal(String(row.total), restaurant.decimals),
    })),
    day,
  );
  return {
    date: day.date,
    currency: restaurant.currency,
    reservationsToday: stats.reservationsToday,
    coversToday: stats.coversToday,
    ordersToProcess: stats.ordersToProcess,
    revenueToday: formatMinor(stats.revenueTodayMinor, restaurant.decimals),
  };
}

// ─── Status changes ───────────────────────────────────────────────────────────

const RESERVATION_NOTICE: Record<string, (restaurant: string, table: string, when: string) => [string, string]> = {
  CONFIRMED: (restaurant, _table, when) => ["Reservation confirmed", `${restaurant} confirmed your reservation on ${when}.`],
  SEATED: (restaurant, table) => ["Welcome!", `You have been seated at table ${table} at ${restaurant}. Enjoy your meal.`],
  COMPLETED: (restaurant) => ["Thank you for your visit", `Your reservation at ${restaurant} is complete. We hope to see you again.`],
  NO_SHOW: (restaurant, _table, when) => [
    "Reservation marked as missed",
    `Your reservation at ${restaurant} on ${when} was marked as a no-show.`,
  ],
  CANCELLED: (restaurant, _table, when) => [
    "Reservation cancelled by the restaurant",
    `${restaurant} cancelled your reservation on ${when}. Any pre-order for it was cancelled too.`,
  ],
};

const ORDER_NOTICE: Record<string, (restaurant: string) => [string, string]> = {
  CONFIRMED: (restaurant) => ["Order confirmed", `${restaurant} confirmed your pre-order.`],
  PREPARING: (restaurant) => ["Your order is being prepared", `The kitchen at ${restaurant} started on your order.`],
  READY: (restaurant) => ["Your order is ready", `Your order at ${restaurant} is ready.`],
  DELIVERED: (restaurant) => ["Order delivered", `Your order at ${restaurant} was delivered. Enjoy!`],
  CANCELLED: (restaurant) => ["Order cancelled", `${restaurant} cancelled your pre-order.`],
};

async function audit(
  tx: Tx,
  userId: string,
  restaurantId: string,
  entityType: "Reservation" | "Order",
  entityId: string,
  metadata: Record<string, unknown>,
) {
  await tx.orm.public.AuditLog.create({
    userId,
    restaurantId,
    action: "STATUS_CHANGE",
    entityType,
    entityId,
    metadata: JSON.parse(JSON.stringify(metadata)),
  });
}

export async function changeReservationStatus(
  userId: string,
  restaurantId: string,
  reservationId: string,
  to: ManagedReservationStatus,
): Promise<ReservationChange> {
  const restaurant = await loadRestaurant(restaurantId);
  const tables = tableLookup();

  const { cancelledOrderIds } = await db.transaction(async (tx) => {
    await advisoryXactLock(tx, `reservation:${reservationId}`);

    const current = await tx.orm.public.Reservation.where({ id: reservationId }).first();
    // Another restaurant's reservation looks exactly like a missing one.
    if (!current || current.restaurantId !== restaurantId) throw new ReservationError("NOT_FOUND", "Reservation not found.");

    const from = current.status as ManagedReservationStatus;
    const verdict = reservationTransition(from, to, clockOf(current, Date.now()));
    if (!verdict.ok) throw new ReservationError(verdict.code, verdict.message);

    await tx.orm.public.Reservation.where({ id: current.id }).update({ status: to });

    const cancelledIds: string[] = [];
    if (to === "CANCELLED") {
      const orders = await tx.orm.public.Order.where({ reservationId: current.id }).all();
      for (const order of orders) {
        if (!(CASCADE_CANCEL_STATUSES as readonly string[]).includes(order.status)) continue;
        await tx.orm.public.Order.where({ id: order.id }).update({ status: "CANCELLED" });
        cancelledIds.push(order.id);
      }
    }

    await audit(tx, userId, restaurantId, "Reservation", current.id, { from, to, cancelledOrders: cancelledIds });

    const notice = RESERVATION_NOTICE[to];
    if (notice) {
      const [title, message] = notice(restaurant.name, await tables(current.tableId), whenText(toMs(current.startsAt), restaurant.timezone));
      await createNotificationIn(tx, {
        userId: current.customerId,
        restaurantId,
        type: "RESERVATION",
        title,
        message,
        data: { reservationId: current.id, status: to },
      });
    }
    return { cancelledOrderIds: cancelledIds };
  });

  const fresh = await loadReservationRow(reservationId);
  if (!fresh) throw new ReservationError("NOT_FOUND", "Reservation not found.");
  const orders = await db.orm.public.Order.where({ reservationId }).all();
  return {
    reservation: await buildReservation(fresh, restaurant, nameLookup(), tables, orders, Date.now()),
    cancelledOrders: cancelledOrderIds.length,
  };
}

export async function changeOrderStatus(
  userId: string,
  restaurantId: string,
  orderId: string,
  to: ManagedOrderStatus,
): Promise<ManagerOrder> {
  const restaurant = await loadRestaurant(restaurantId);
  const first = await loadOrderRow(orderId);
  if (!first || first.restaurantId !== restaurantId) throw new ReservationError("NOT_FOUND", "Order not found.");

  await db.transaction(async (tx) => {
    // Same key as the reservation's own changes, so an order and its reservation never race.
    await advisoryXactLock(tx, first.reservationId ? `reservation:${first.reservationId}` : `order:${orderId}`);

    const current = await tx.orm.public.Order.where({ id: orderId }).first();
    if (!current || current.restaurantId !== restaurantId) throw new ReservationError("NOT_FOUND", "Order not found.");
    const reservation = current.reservationId
      ? await tx.orm.public.Reservation.where({ id: current.reservationId }).first()
      : null;

    const from = current.status as ManagedOrderStatus;
    const verdict = orderTransition(from, to, reservation?.status ?? null);
    if (!verdict.ok) throw new ReservationError(verdict.code, verdict.message);

    await tx.orm.public.Order.where({ id: current.id }).update({ status: to });
    await audit(tx, userId, restaurantId, "Order", current.id, { from, to, reservationId: current.reservationId });

    const notice = ORDER_NOTICE[to];
    if (notice) {
      const [title, message] = notice(restaurant.name);
      await createNotificationIn(tx, {
        userId: current.customerId,
        restaurantId,
        type: "ORDER",
        title,
        message,
        data: { orderId: current.id, ...(current.reservationId ? { reservationId: current.reservationId } : {}), status: to },
      });
    }
  });

  const fresh = await loadOrderRow(orderId);
  if (!fresh) throw new ReservationError("NOT_FOUND", "Order not found.");
  const reservation = fresh.reservationId ? await loadReservationRow(fresh.reservationId) : null;
  return buildOrder(fresh, restaurant, nameLookup(), tableLookup(), reservation);
}

// ─── Recent activity ──────────────────────────────────────────────────────────

const RESERVATION_TITLE: Record<string, string> = {
  CONFIRMED: "Reservation confirmed",
  SEATED: "Guests seated",
  COMPLETED: "Reservation completed",
  CANCELLED: "Reservation cancelled",
  NO_SHOW: "Reservation no-show",
};

const ORDER_TITLE: Record<string, string> = {
  CONFIRMED: "Order confirmed",
  PREPARING: "Order in preparation",
  READY: "Order ready",
  DELIVERED: "Order delivered",
  CANCELLED: "Order cancelled",
};

/** The latest reservation and order events of a restaurant, read from the AuditLog. */
export async function listActivity(restaurantId: string, limit = 8): Promise<ActivityItem[]> {
  const restaurant = await loadRestaurant(restaurantId);
  const logs = await db.orm.public.AuditLog.where({ restaurantId }).all();
  const recent = logs
    .filter((log) => (log.entityType === "Reservation" || log.entityType === "Order") && log.entityId)
    .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
    .slice(0, limit);

  const tables = tableLookup();
  const items: ActivityItem[] = [];
  for (const log of recent) {
    const metadata = (log.metadata ?? {}) as { to?: string };
    const status = metadata.to ?? null;
    if (log.entityType === "Reservation") {
      const row = await loadReservationRow(log.entityId as string);
      if (!row) continue;
      items.push({
        id: log.id,
        kind: "reservation",
        title: status ? (RESERVATION_TITLE[status] ?? "Reservation updated") : "New reservation",
        subtitle: `${await tables(row.tableId)} · ${row.guestCount} ${row.guestCount === 1 ? "guest" : "guests"}`,
        at: toIso(log.createdAt),
        status,
      });
    } else {
      const row = await loadOrderRow(log.entityId as string);
      if (!row) continue;
      items.push({
        id: log.id,
        kind: "order",
        title: status ? (ORDER_TITLE[status] ?? "Order updated") : "New pre-order",
        subtitle: `${money(row.total, restaurant.decimals)} ${restaurant.currency}`,
        at: toIso(log.createdAt),
        status,
      });
    }
  }
  return items;
}

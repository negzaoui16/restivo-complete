/**
 * Pre-orders linked to one of the customer's upcoming reservations.
 *
 * The client sends dish ids and quantities only. Names, prices and promotions
 * are read from the database here, priced in integers, and snapshotted on the
 * order. The reservation is re-checked under the same advisory lock the
 * cancellation uses, so an order can never slip in after a cancellation.
 */
import { cancelledByRestaurant } from "@/lib/manager/cancellation";
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { advisoryXactLock } from "@/lib/locks";
import { CANCELLABLE_STATUSES } from "@/lib/reservations/constants";
import { canCancel, ownsReservation } from "@/lib/reservations/rules";
import { loadOrderableMenu } from "./menu";
import { OrderError } from "./errors";
import { computeTotals, formatMinor, priceUnit, type PricedLine } from "./pricing";
import type { CreateOrderBody } from "./validation";
import type { OrderStatus, PublicOrder } from "./types";

function toInstant(value: unknown): Temporal.Instant {
  return Temporal.Instant.from(String(value));
}

/** A pre-order needs the customer's own reservation, still active and not started. */
function assertOrderable(
  reservation: { customerId: string; status: string; startsAt: unknown },
  userId: string,
) {
  if (!ownsReservation(userId, reservation.customerId)) throw new OrderError("FORBIDDEN");
  const startsAtMs = toInstant(reservation.startsAt).epochMilliseconds;
  if (!canCancel(reservation.status, startsAtMs, Date.now(), CANCELLABLE_STATUSES)) {
    throw new OrderError("RESERVATION_NOT_ORDERABLE");
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PricedOrder = {
  currency: string;
  decimals: number;
  lines: (PricedLine & { menuItemId: string; name: string; notes: string | null })[];
  totals: ReturnType<typeof computeTotals>;
};

/**
 * Prices the requested dishes from the database (never from the client).
 * Throws when the menu is unpublished or a dish is unknown or unavailable.
 */
export async function priceOrderLines(restaurantId: string, items: CreateOrderBody["items"]): Promise<PricedOrder> {
  const loaded = await loadOrderableMenu(restaurantId);
  if (!loaded.menu) throw new OrderError("MENU_UNAVAILABLE");
  const { currency, decimals } = loaded;

  // Same dish twice in the request: add the quantities.
  const wanted = new Map<string, { quantity: number; notes: string | null }>();
  for (const line of items) {
    const previous = wanted.get(line.menuItemId);
    wanted.set(line.menuItemId, {
      quantity: (previous?.quantity ?? 0) + line.quantity,
      notes: line.notes ?? previous?.notes ?? null,
    });
  }

  const lines: (PricedLine & { menuItemId: string; name: string; notes: string | null })[] = [];
  for (const [menuItemId, request] of wanted) {
    const item = loaded.menu.items.get(menuItemId);
    // Unknown id, another restaurant's dish, hidden category: all the same refusal.
    if (!item) throw new OrderError("ITEM_NOT_FOUND");
    if (!item.isAvailable) throw new OrderError("ITEM_UNAVAILABLE", `${item.name} is not available right now.`);
    lines.push({
      ...priceUnit(item.price, item.promotions, decimals),
      quantity: request.quantity,
      menuItemId,
      name: item.name,
      notes: request.notes,
    });
  }
  return { currency, decimals, lines, totals: computeTotals(lines) };
}

/** Writes the order, its lines and the audit entry inside an open transaction. */
export async function insertOrder(
  tx: Tx,
  userId: string,
  reservation: { id: string; restaurantId: string; tableId: string },
  priced: PricedOrder,
  notes: string | undefined,
) {
  const { currency, decimals, lines, totals } = priced;
  const order = await tx.orm.public.Order.create({
    restaurantId: reservation.restaurantId,
    customerId: userId,
    reservationId: reservation.id,
    tableId: reservation.tableId,
    status: "PENDING",
    notes: notes ? notes : null,
    subtotal: formatMinor(totals.subtotal, decimals),
    discount: formatMinor(totals.discount, decimals),
    total: formatMinor(totals.total, decimals),
  });
  for (const line of lines) {
    await tx.orm.public.OrderItem.create({
      orderId: order.id,
      menuItemId: line.menuItemId,
      nameSnapshot: line.name,
      priceSnapshot: formatMinor(line.unitPrice, decimals),
      quantity: line.quantity,
      notes: line.notes,
    });
  }
  await tx.orm.public.AuditLog.create({
    userId,
    restaurantId: reservation.restaurantId,
    action: "CREATE",
    entityType: "Order",
    entityId: order.id,
    metadata: JSON.parse(
      JSON.stringify({
        reservationId: reservation.id,
        lines: lines.length,
        total: formatMinor(totals.total, decimals),
        currency,
      }),
    ),
  });
  return order;
}

export async function createOrder(userId: string, input: CreateOrderBody): Promise<PublicOrder> {
  const reservation = await db.orm.public.Reservation.where({ id: input.reservationId }).first();
  if (!reservation) throw new OrderError("NOT_FOUND", "Reservation not found.");
  assertOrderable(reservation, userId);

  const priced = await priceOrderLines(reservation.restaurantId, input.items);

  const created = await db.transaction(async (tx) => {
    await advisoryXactLock(tx, `reservation:${reservation.id}`);
    const fresh = await tx.orm.public.Reservation.where({ id: reservation.id }).first();
    if (!fresh) throw new OrderError("NOT_FOUND", "Reservation not found.");
    assertOrderable(fresh, userId);
    return insertOrder(tx, userId, fresh, priced, input.notes);
  });

  const [order] = await toPublicOrders([created.id], userId);
  return order;
}

/** An order is cancelled by the restaurant directly, or through its reservation. */
async function orderCancelledByRestaurant(order: { id: string; status: string; customerId: string; reservationId: string | null }) {
  if (order.status !== "CANCELLED") return false;
  if (await cancelledByRestaurant("Order", order.id, order.customerId)) return true;
  return order.reservationId ? cancelledByRestaurant("Reservation", order.reservationId, order.customerId) : false;
}

export async function listMyOrders(userId: string, reservationId?: string): Promise<PublicOrder[]> {
  const rows = await db.orm.public.Order.where(
    reservationId ? { customerId: userId, reservationId } : { customerId: userId },
  ).all();
  return toPublicOrders(
    rows.map((row) => row.id),
    userId,
  );
}

export async function toPublicOrders(orderIds: string[], userId: string): Promise<PublicOrder[]> {
  const restaurants = new Map<string, Awaited<ReturnType<typeof loadRestaurant>>>();
  const reservations = new Map<string, Awaited<ReturnType<typeof loadReservation>>>();
  const result: (PublicOrder & { createdMs: number })[] = [];

  for (const id of orderIds) {
    const order = await db.orm.public.Order.where({ id }).first();
    if (!order || order.customerId !== userId) continue;

    if (!restaurants.has(order.restaurantId)) restaurants.set(order.restaurantId, await loadRestaurant(order.restaurantId));
    const restaurant = restaurants.get(order.restaurantId);
    if (!restaurant) continue;

    let reservation: PublicOrder["reservation"] = null;
    if (order.reservationId) {
      if (!reservations.has(order.reservationId)) {
        reservations.set(order.reservationId, await loadReservation(order.reservationId));
      }
      const loaded = reservations.get(order.reservationId);
      if (loaded) {
        reservation = {
          id: loaded.row.id,
          code: loaded.row.reservationCode,
          startsAt: toInstant(loaded.row.startsAt).toString(),
          tableName: loaded.tableName,
        };
      }
    }

    const items = await db.orm.public.OrderItem.where({ orderId: order.id }).all();
    const createdMs = toInstant(order.createdAt).epochMilliseconds;
    result.push({
      id: order.id,
      status: order.status as OrderStatus,
      createdAt: toInstant(order.createdAt).toString(),
      notes: order.notes,
      currency: restaurant.currency,
      subtotal: String(order.subtotal),
      discount: String(order.discount),
      total: String(order.total),
      items: items.map((item) => ({
        id: item.id,
        name: item.nameSnapshot,
        quantity: item.quantity,
        unitPrice: String(item.priceSnapshot),
        notes: item.notes,
      })),
      restaurant: { id: restaurant.id, name: restaurant.name, timezone: restaurant.timezone },
      reservation,
      cancelledByRestaurant: await orderCancelledByRestaurant(order),
      createdMs,
    });
  }

  return result
    .sort((a, b) => b.createdMs - a.createdMs)
    .map((entry) => {
      const { createdMs, ...order } = entry;
      void createdMs;
      return order;
    });
}

function loadRestaurant(id: string) {
  return db.orm.public.Restaurant.where({ id }).first();
}

async function loadReservation(id: string) {
  const row = await db.orm.public.Reservation.where({ id }).first();
  if (!row) return null;
  const table = await db.orm.public.Table.where({ id: row.tableId }).first();
  return { row, tableName: table?.name ?? "" };
}

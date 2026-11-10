/**
 * Reservation + optional pre-order in a single transaction.
 *
 * Everything that can be refused without writing (slot, hours, capacity, menu,
 * dishes, pricing) is checked first. The reservation and the order are then
 * written together under the table lock, so a customer can never end up with a
 * reservation whose order failed, nor with an order whose table was taken.
 * Prices come from the database; the client sends dish ids and quantities only.
 */
import { db } from "@/lib/db";
import { insertOrder, priceOrderLines, toPublicOrders } from "@/lib/orders/service";
import type { PublicOrder } from "@/lib/orders/types";
import {
  bookingAuditMetadata,
  insertReservation,
  prepareBooking,
  toPublicReservation,
  writeBookingAuditIn,
} from "./service";
import type { PublicReservation } from "./types";
import type { CheckoutBody } from "./validation";

export async function checkout(
  userId: string,
  input: CheckoutBody,
): Promise<{ reservation: PublicReservation; order: PublicOrder | null }> {
  const prepared = await prepareBooking(input.reservation);
  const priced = input.order ? await priceOrderLines(prepared.restaurant.id, input.order.items) : null;

  const { reservation, orderId } = await db.transaction(async (tx) => {
    const created = await insertReservation(tx, userId, prepared, input.reservation);
    await writeBookingAuditIn(
      tx,
      userId,
      prepared.restaurant.id,
      created.id,
      bookingAuditMetadata(prepared, input.reservation.guestCount),
    );
    const order =
      priced && input.order ? await insertOrder(tx, userId, created, priced, input.order.notes) : null;
    return { reservation: created, orderId: order?.id ?? null };
  });

  const [order] = orderId ? await toPublicOrders([orderId], userId) : [null];
  return { reservation: toPublicReservation(reservation, prepared), order: order ?? null };
}

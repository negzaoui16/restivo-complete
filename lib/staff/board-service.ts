/**
 * The service board for STAFF: today's reservations and the kitchen orders of the restaurant.
 * It reuses the manager service (same transitions, locks, audit log and customer notifications)
 * and narrows what goes in and what comes out.
 */
import { AuthError } from "@/lib/auth/errors";
import { changeOrderStatus, changeReservationStatus, listOrders, listReservations } from "@/lib/manager/service";
import type { StaffOrder, StaffOrderList, StaffReservation, StaffReservationList } from "./board-types";
import {
  STAFF_ORDER_STATUSES,
  STAFF_RESERVATION_STATUSES,
  isStaffOrderTarget,
  isStaffReservationTarget,
  staffOrderActions,
  staffReservationActions,
} from "./service-rules";

export async function listStaffReservations(restaurantId: string): Promise<StaffReservationList> {
  const list = await listReservations(restaurantId, { status: [...STAFF_RESERVATION_STATUSES] });
  const reservations: StaffReservation[] = list.reservations.map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status as StaffReservation["status"],
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    guestCount: row.guestCount,
    notes: row.notes,
    tableName: row.table.name,
    customerName: row.customer.name,
    orderCount: row.orders.filter((order) => order.status !== "CANCELLED").length,
    actions: staffReservationActions(row.actions),
  }));
  return { timezone: list.timezone, date: list.from, reservations };
}

export async function listStaffOrders(restaurantId: string): Promise<StaffOrderList> {
  const list = await listOrders(restaurantId, { status: [...STAFF_ORDER_STATUSES], date: "today" });
  const orders: StaffOrder[] = list.orders.map((row) => ({
    id: row.id,
    status: row.status as StaffOrder["status"],
    createdAt: row.createdAt,
    notes: row.notes,
    customerName: row.customer.name,
    items: row.items.map((line) => ({ id: line.id, name: line.name, quantity: line.quantity, notes: line.notes })),
    reservation: row.reservation
      ? { id: row.reservation.id, code: row.reservation.code, startsAt: row.reservation.startsAt, tableName: row.reservation.tableName }
      : null,
    actions: staffOrderActions(row.actions),
  }));
  return { timezone: list.timezone, date: list.date, orders };
}

export async function setStaffReservationStatus(userId: string, restaurantId: string, reservationId: string, to: string) {
  if (!isStaffReservationTarget(to)) throw new AuthError("FORBIDDEN", "Staff can only seat or complete a reservation.");
  const change = await changeReservationStatus(userId, restaurantId, reservationId, to);
  return change.reservation;
}

export async function setStaffOrderStatus(userId: string, restaurantId: string, orderId: string, to: string) {
  if (!isStaffOrderTarget(to)) throw new AuthError("FORBIDDEN", "Staff can only move an order to preparing, ready or delivered.");
  return changeOrderStatus(userId, restaurantId, orderId, to);
}

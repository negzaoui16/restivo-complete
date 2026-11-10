import type { StaffOrderTarget, StaffReservationTarget } from "./service-rules";

/** What the staff board shows. There is no money anywhere in these shapes, on purpose. */

export type StaffReservation = {
  id: string;
  code: string;
  status: "PENDING" | "CONFIRMED" | "SEATED" | "COMPLETED";
  /** UTC ISO instants; show them in `timezone`. */
  startsAt: string;
  endsAt: string;
  guestCount: number;
  notes: string | null;
  tableName: string;
  customerName: string;
  /** Pre-orders linked to the reservation that are not cancelled. */
  orderCount: number;
  /** Moves allowed right now (Seat, Complete). */
  actions: StaffReservationTarget[];
};

export type StaffReservationList = { timezone: string; date: string; reservations: StaffReservation[] };

export type StaffOrderLine = { id: string; name: string; quantity: number; notes: string | null };

export type StaffOrder = {
  id: string;
  status: "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED";
  createdAt: string;
  notes: string | null;
  customerName: string;
  items: StaffOrderLine[];
  reservation: { id: string; code: string; startsAt: string; tableName: string } | null;
  /** Moves allowed right now (Preparing, Ready, Delivered). */
  actions: StaffOrderTarget[];
};

export type StaffOrderList = { timezone: string; date: string | null; orders: StaffOrder[] };

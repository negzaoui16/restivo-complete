import type { ManagedOrderStatus } from "@/lib/orders/transitions";
import type { ManagedReservationStatus } from "@/lib/reservations/transitions";

/** Money is always a decimal string with the currency decimals (e.g. "12.500"). */

export type ManagerOrderLine = { id: string; name: string; quantity: number; unitPrice: string; notes: string | null };

export type ManagerOrderSummary = { id: string; status: ManagedOrderStatus; total: string };

export type ManagerReservation = {
  id: string;
  code: string;
  status: ManagedReservationStatus;
  /** UTC ISO instants; show them in `timezone`. */
  startsAt: string;
  endsAt: string;
  guestCount: number;
  notes: string | null;
  table: { id: string; name: string };
  customer: { id: string; name: string };
  /** Pre-orders linked to this reservation. */
  orders: ManagerOrderSummary[];
  /** Total of the pre-orders that are not cancelled. */
  ordersTotal: string;
  /** Statuses the manager can move to right now. */
  actions: ManagedReservationStatus[];
};

export type ManagerReservationList = {
  timezone: string;
  currency: string;
  /** Local day (or range start) used by the filter, "YYYY-MM-DD". */
  from: string;
  to: string;
  reservations: ManagerReservation[];
};

export type ManagerOrder = {
  id: string;
  status: ManagedOrderStatus;
  createdAt: string;
  notes: string | null;
  currency: string;
  subtotal: string;
  discount: string;
  total: string;
  items: ManagerOrderLine[];
  customer: { id: string; name: string };
  reservation: { id: string; code: string; status: ManagedReservationStatus; startsAt: string; tableName: string } | null;
  actions: ManagedOrderStatus[];
};

export type ManagerOrderList = {
  timezone: string;
  currency: string;
  /** Local day the list was filtered on, or null when it covers every day. */
  date: string | null;
  orders: ManagerOrder[];
};

export type ManagerStats = {
  /** Local day the numbers are for. */
  date: string;
  currency: string;
  reservationsToday: number;
  coversToday: number;
  ordersToProcess: number;
  revenueToday: string;
};

export type ReservationChange = { reservation: ManagerReservation; cancelledOrders: number };

export type ActivityItem = {
  id: string;
  kind: "reservation" | "order";
  title: string;
  subtitle: string;
  /** UTC ISO instant. */
  at: string;
  /** Status the entity moved to, when the entry is a status change. */
  status: string | null;
};

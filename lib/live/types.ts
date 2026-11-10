import type { LiveTableState } from "./state";
import type { ManagedReservationStatus } from "@/lib/reservations/transitions";

/** The statuses the live floor can set: Seat, Complete and No-show. Cancelling stays on the reservations page. */
export type LiveAction = Extract<ManagedReservationStatus, "SEATED" | "COMPLETED" | "NO_SHOW">;

export type LiveReservation = {
  id: string;
  code: string;
  status: ManagedReservationStatus;
  /** UTC ISO instants; show them in the restaurant's time zone. */
  startsAt: string;
  endsAt: string;
  guestCount: number;
  notes: string | null;
  customerName: string;
  /** Live actions allowed right now (computed on the server clock). */
  actions: LiveAction[];
};

export type LiveTable = {
  id: string;
  name: string;
  floorId: string;
  capacity: number;
  state: LiveTableState;
  current: LiveReservation | null;
  next: LiveReservation | null;
};

export type LiveFloorSummary = { id: string; name: string };

export type LiveState = {
  /** Server clock (UTC ISO) the states and the timers are computed from. */
  now: string;
  timezone: string;
  floors: LiveFloorSummary[];
  tables: LiveTable[];
};

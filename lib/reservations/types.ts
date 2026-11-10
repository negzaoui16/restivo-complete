export type ReservationStatus = "PENDING" | "CONFIRMED" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type PublicReservation = {
  id: string;
  code: string;
  status: ReservationStatus;
  /** UTC ISO instants; show them in `restaurant.timezone`. */
  startsAt: string;
  endsAt: string;
  guestCount: number;
  notes: string | null;
  restaurant: { id: string; name: string; city: string | null; timezone: string };
  table: { id: string; name: string };
  canCancel: boolean;
  /** True when the restaurant, not the customer, cancelled it. */
  cancelledByRestaurant: boolean;
  /** The customer's own review of this reservation, when they left one. */
  review: { rating: number } | null;
};

export type TableAvailability = {
  tableId: string;
  state: "free" | "taken" | "too_small";
};

export type AvailabilityIssueCode = "OUTSIDE_HOURS" | "TOO_SOON" | "TOO_FAR";

export type Availability = {
  slot: { startsAt: string; endsAt: string; durationMinutes: number };
  /** Set when the chosen date and time cannot be booked at all. */
  issue: { code: AvailabilityIssueCode; message: string } | null;
  tables: TableAvailability[];
};

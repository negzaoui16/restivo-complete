/** Booking policy for V1. Change a value here and every layer follows. */

/** A reservation holds its table for this long, counted from the start. */
export const SLOT_DURATION_MINUTES = 90;

/** A table cannot be booked closer than this to the start of the slot. */
export const MIN_LEAD_MINUTES = 30;

/** A table cannot be booked further ahead than this. */
export const MAX_DAYS_AHEAD = 60;

export const MAX_GUESTS = 50;

/** Statuses that keep a table occupied. COMPLETED, CANCELLED and NO_SHOW free it. */
export const BLOCKING_STATUSES = ["PENDING", "CONFIRMED", "SEATED"] as const;

/** A customer may cancel only these, and only while the slot is still ahead. */
export const CANCELLABLE_STATUSES = ["PENDING", "CONFIRMED"] as const;

/** A customer may change these only, and only while the slot is still ahead. */
export const EDITABLE_STATUSES = ["PENDING", "CONFIRMED"] as const;

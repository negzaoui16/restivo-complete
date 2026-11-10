/** Pre-order limits and lifecycle rules for V1. */

export const MAX_ORDER_LINES = 30;
export const MAX_LINE_QUANTITY = 20;

/** Pre-orders in these statuses are cancelled together with their reservation. */
export const CASCADE_CANCEL_STATUSES = ["PENDING", "CONFIRMED"] as const;

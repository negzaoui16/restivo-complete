/**
 * Typed reservation errors, same JSON shape as the other domains so the shared
 * client `ApiError` parser keeps working.
 */
import { AuthError, toErrorResponse } from "@/lib/auth/errors";

export const RESERVATION_ERROR_CODES = {
  VALIDATION_ERROR: { status: 422, message: "The request contains invalid data." },
  NOT_FOUND: { status: 404, message: "The requested resource was not found." },
  FORBIDDEN: { status: 403, message: "This reservation belongs to another customer." },
  OUTSIDE_HOURS: { status: 422, message: "The whole reservation must fit within the opening hours." },
  TOO_SOON: { status: 422, message: "Reservations must be made at least 30 minutes ahead." },
  TOO_FAR: { status: 422, message: "Reservations can be made up to 60 days ahead." },
  TABLE_TOO_SMALL: { status: 422, message: "This table does not seat that many guests." },
  SLOT_TAKEN: { status: 409, message: "This table is already booked for that time. Please pick another." },
  NOT_CANCELLABLE: { status: 409, message: "Only upcoming reservations can be cancelled." },
  NOT_MODIFIABLE: {
    status: 409,
    message: "Only an upcoming reservation that has not started can be changed.",
  },
  NOT_REVIEWABLE: {
    status: 409,
    message: "You can review a reservation once the restaurant has marked it as completed.",
  },
  ALREADY_REVIEWED: { status: 409, message: "You already reviewed this reservation." },
  INVALID_TRANSITION: { status: 409, message: "This status change is not allowed." },
  TOO_EARLY: { status: 409, message: "It is too early for this status change." },
  TOO_LATE: { status: 409, message: "It is too late for this status change." },
  RESERVATION_CLOSED: { status: 409, message: "The reservation of this order is closed." },
  INTERNAL_ERROR: { status: 500, message: "An unexpected error occurred. Please try again later." },
} as const;

export type ReservationErrorCode = keyof typeof RESERVATION_ERROR_CODES;

export class ReservationError extends Error {
  readonly code: ReservationErrorCode;
  readonly httpStatus: number;

  constructor(code: ReservationErrorCode, detailOverride?: string) {
    const entry = RESERVATION_ERROR_CODES[code];
    super(detailOverride ?? entry.message);
    this.name = "ReservationError";
    this.code = code;
    this.httpStatus = entry.status;
  }
}

export function toReservationErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) return toErrorResponse(err);
  if (err instanceof ReservationError) {
    return Response.json({ ok: false, code: err.code, message: err.message }, { status: err.httpStatus });
  }

  console.error("[reservations] Unhandled error:", err);
  return Response.json(
    { ok: false, code: "INTERNAL_ERROR", message: RESERVATION_ERROR_CODES.INTERNAL_ERROR.message },
    { status: 500 },
  );
}

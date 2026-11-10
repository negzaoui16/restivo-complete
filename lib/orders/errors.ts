/**
 * Typed order errors, same JSON shape as the other domains so the shared
 * client `ApiError` parser keeps working.
 */
import { AuthError, toErrorResponse } from "@/lib/auth/errors";

export const ORDER_ERROR_CODES = {
  VALIDATION_ERROR: { status: 422, message: "The request contains invalid data." },
  NOT_FOUND: { status: 404, message: "The requested resource was not found." },
  FORBIDDEN: { status: 403, message: "This reservation belongs to another customer." },
  RESERVATION_NOT_ORDERABLE: {
    status: 409,
    message: "You can only pre-order on an upcoming reservation that is still active.",
  },
  MENU_UNAVAILABLE: { status: 409, message: "This restaurant has not published its menu yet." },
  ITEM_NOT_FOUND: { status: 422, message: "One of the dishes is not on this restaurant's menu." },
  ITEM_UNAVAILABLE: { status: 409, message: "One of the dishes is not available right now." },
  INTERNAL_ERROR: { status: 500, message: "An unexpected error occurred. Please try again later." },
} as const;

export type OrderErrorCode = keyof typeof ORDER_ERROR_CODES;

export class OrderError extends Error {
  readonly code: OrderErrorCode;
  readonly httpStatus: number;

  constructor(code: OrderErrorCode, detailOverride?: string) {
    const entry = ORDER_ERROR_CODES[code];
    super(detailOverride ?? entry.message);
    this.name = "OrderError";
    this.code = code;
    this.httpStatus = entry.status;
  }
}

export function toOrderErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) return toErrorResponse(err);
  if (err instanceof OrderError) {
    return Response.json({ ok: false, code: err.code, message: err.message }, { status: err.httpStatus });
  }

  console.error("[orders] Unhandled error:", err);
  return Response.json(
    { ok: false, code: "INTERNAL_ERROR", message: ORDER_ERROR_CODES.INTERNAL_ERROR.message },
    { status: 500 },
  );
}

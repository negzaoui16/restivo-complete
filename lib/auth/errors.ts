/**
 * Typed, predefined auth error system.
 *
 * Every error that can originate in the auth layer has a well-known `code`
 * so the client always receives structured, predictable error shapes –
 * raw server errors are never exposed.
 *
 * Usage
 * -----
 *   throw new AuthError("EMAIL_ALREADY_EXISTS");
 *   throw new AuthError("VALIDATION_ERROR", "email must be a valid e-mail");
 */

// ─── Error Code Registry ────────────────────────────────────────────────────

export const AUTH_ERROR_CODES = {
  // Sign-up
  EMAIL_ALREADY_EXISTS: {
    status: 409,
    message: "An account with this e-mail address already exists.",
  },

  // Sign-in
  INVALID_CREDENTIALS: {
    status: 401,
    message: "The e-mail or password you entered is incorrect.",
  },
  USER_SUSPENDED: {
    status: 403,
    message: "This account has been suspended. Please contact support.",
  },
  USER_DELETED: {
    status: 403,
    message: "This account no longer exists.",
  },

  // Tokens
  MISSING_TOKEN: {
    status: 401,
    message: "Authentication token is missing.",
  },
  INVALID_TOKEN: {
    status: 401,
    message: "The provided token is invalid.",
  },
  EXPIRED_TOKEN: {
    status: 401,
    message: "The provided token has expired. Please sign in again.",
  },

  FORBIDDEN: {
    status: 403,
    message: "You do not have permission to access this resource.",
  },
  VALIDATION_ERROR: {
    status: 422,
    message: "The request body contains invalid data.",
  },

  // Catch-all (internal, never leaks server details)
  INTERNAL_ERROR: {
    status: 500,
    message: "An unexpected error occurred. Please try again later.",
  },
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_CODES;

// ─── Error Class ─────────────────────────────────────────────────────────────

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly httpStatus: number;

  constructor(code: AuthErrorCode, detailOverride?: string) {
    const entry = AUTH_ERROR_CODES[code];
    super(detailOverride ?? entry.message);
    this.name = "AuthError";
    this.code = code;
    this.httpStatus = entry.status;
  }
}

// ─── Response Builder ────────────────────────────────────────────────────────

export interface AuthErrorBody {
  ok: false;
  code: AuthErrorCode;
  message: string;
}

/**
 * Converts an `AuthError` (or any unknown thrown value) into a typed JSON
 * `Response` that is safe to return from a route handler.
 */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    const body: AuthErrorBody = {
      ok: false,
      code: err.code,
      message: err.message,
    };
    return Response.json(body, { status: err.httpStatus });
  }

  // Unknown/internal error – log it server-side but never expose details
  console.error("[auth] Unhandled error:", err);

  const body: AuthErrorBody = {
    ok: false,
    code: "INTERNAL_ERROR",
    message: AUTH_ERROR_CODES.INTERNAL_ERROR.message,
  };
  return Response.json(body, { status: 500 });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** The SQLSTATE or driver error code (supporting PostgreSQL & MongoDB E11000). */
function pgState(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  const { sqlState, code, cause } = err as { sqlState?: unknown; code?: unknown; cause?: unknown };
  if (typeof sqlState === "string") return sqlState;
  if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
  if (typeof code === "number") return String(code);
  return cause ? pgState(cause) : null;
}

/** True when an error is a unique-constraint violation (Postgres 23505 or MongoDB 11000). */
export function isPgUniqueViolation(err: unknown): boolean {
  const st = pgState(err);
  return st === "23505" || st === "11000";
}

/** True when an error is a foreign-key violation. */
export function isPgForeignKeyViolation(err: unknown): boolean {
  return pgState(err) === "23503";
}

/**
 * Centralised auth constants – single source of truth for expiry windows,
 * cookie names, and algorithm settings.
 */

/** Access-token lifetime (15 minutes). Used by `jose` for JWT `exp` claim. */
export const ACCESS_TOKEN_TTL = "15m";

/** Refresh-token lifetime (7 days). */
export const REFRESH_TOKEN_TTL = "7d";

/**
 * Max-age in **seconds** for the refresh token cookie.
 * 7 days × 24 h × 60 min × 60 s = 604 800 s
 */
export const REFRESH_TOKEN_MAX_AGE_S = 7 * 24 * 60 * 60;

/** HttpOnly cookie that holds the refresh token. */
export const REFRESH_COOKIE_NAME = "restivo_rt";

/**
 * Non-httpOnly flag the client can read.  Presence means "a refresh cookie
 * should exist" so we skip calling `/api/auth/refresh` on anonymous visits
 * (which would otherwise 401 in the browser console).
 */
export const SESSION_HINT_COOKIE_NAME = "restivo_sid";

/** JWT signing algorithm (HMAC-SHA256 – symmetric, server-only secret). */
export const JWT_ALGORITHM = "HS256" as const;

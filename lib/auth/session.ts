/**
 * Request-scoped auth helpers for route handlers.
 *
 * Reads the access token from `Authorization: Bearer …`, verifies it,
 * and returns the authenticated user id. Never exposes jose errors.
 */
import { AuthError } from "./errors";
import { verifyAccessToken, verifyRefreshToken } from "./jwt";
import { getRefreshTokenCookie } from "./cookies";

export async function requireUserId(request: Request): Promise<string> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const payload = await verifyAccessToken(token);
        if (payload.sub) return payload.sub;
      } catch {
        // Bearer token expired or invalid; fall through to refresh cookie check
      }
    }
  }

  // Graceful fallback to verified httpOnly session cookie
  const cookieUserId = await getUserIdFromRefreshCookie();
  if (cookieUserId) return cookieUserId;

  throw new AuthError("MISSING_TOKEN");
}

/** Resolves the signed-in user from the httpOnly refresh cookie (RSC / layouts). */
export async function getUserIdFromRefreshCookie(): Promise<string | null> {
  const token = await getRefreshTokenCookie();
  if (!token) return null;

  try {
    const payload = await verifyRefreshToken(token);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

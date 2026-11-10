/**
 * POST /api/auth/refresh
 *
 * Issues a fresh access token (and rotates the refresh token) using the
 * httpOnly refresh token cookie.
 *
 * Token rotation: every call replaces the old refresh token with a new one,
 * limiting the window of opportunity if a token is ever stolen.
 *
 * The user's account status is re-checked on every refresh so suspended
 * accounts lose access within one refresh cycle even if they have a valid
 * refresh token.
 */
import { db } from "@/lib/db";
import { AuthError, toErrorResponse } from "@/lib/auth/errors";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { NextResponse } from "next/server";
import {
  applyClearedRefreshCookies,
  getRefreshTokenCookie,
  jsonWithRefreshCookie,
} from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  try {
    // ── 1. Read refresh token from cookie ─────────────────────────────────
    const token = await getRefreshTokenCookie();
    if (!token) throw new AuthError("MISSING_TOKEN");

    // ── 2. Verify the token signature, type, and expiry ───────────────────
    const payload = await verifyRefreshToken(token);
    const userId = payload.sub!;

    // ── 3. Re-validate the account ─────────────────────────────────────────
    const user = await db.orm.public.User.where({ id: userId }).first();
    if (!user) {
      throw new AuthError("INVALID_TOKEN");
    }
    if (user.status === "SUSPENDED") throw new AuthError("USER_SUSPENDED");
    if (user.status === "DELETED") {
      throw new AuthError("USER_DELETED");
    }

    const [accessToken, newRefreshToken] = await Promise.all([
      signAccessToken(user.id, user.email),
      signRefreshToken(user.id),
    ]);

    return jsonWithRefreshCookie({ ok: true, accessToken }, newRefreshToken);
  } catch (err) {
    const response = toErrorResponse(err);
    if (err instanceof AuthError && (err.code === "INVALID_TOKEN" || err.code === "USER_DELETED")) {
      return applyClearedRefreshCookies(
        NextResponse.json(
          { ok: false, code: err.code, message: err.message },
          { status: err.httpStatus }
        )
      );
    }
    return response;
  }
}

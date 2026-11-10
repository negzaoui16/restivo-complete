/**
 * Cookie helpers for the auth refresh token.
 *
 * Writes go on a `NextResponse` so `Set-Cookie` actually lands on the
 * outgoing response.  `cookies().set()` + `Response.json()` drops the
 * header in App Router route handlers — the client then keeps a stale
 * session while in-memory auth (navbar) is already the new user.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_MAX_AGE_S,
  SESSION_HINT_COOKIE_NAME,
} from "./constants";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const cookieBase = {
  secure: IS_PRODUCTION,
  sameSite: "lax" as const,
  maxAge: REFRESH_TOKEN_MAX_AGE_S,
  path: "/",
} as const;

export function applyRefreshTokenCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(REFRESH_COOKIE_NAME, token, { ...cookieBase, httpOnly: true });
  response.cookies.set(SESSION_HINT_COOKIE_NAME, "1", { ...cookieBase, httpOnly: false });
  return response;
}

export function applyClearedRefreshCookies(response: NextResponse): NextResponse {
  response.cookies.delete(REFRESH_COOKIE_NAME);
  response.cookies.delete(SESSION_HINT_COOKIE_NAME);
  return response;
}

export function jsonWithRefreshCookie(
  body: unknown,
  token: string,
  status = 200
): NextResponse {
  return applyRefreshTokenCookie(NextResponse.json(body, { status }), token);
}

/** Reads the refresh token from the cookie jar. Returns `null` if absent. */
export async function getRefreshTokenCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(REFRESH_COOKIE_NAME)?.value ?? null;
}

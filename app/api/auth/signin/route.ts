/**
 * POST /api/auth/signin
 *
 * Authenticates an existing user.
 *
 * 1. Validates request body (email, password)
 * 2. Looks up the user by e-mail
 * 3. Verifies the password
 * 4. Guards against suspended/deleted accounts
 * 5. Issues an access token (15 min) and a refresh token (7 days)
 * 6. Sets the refresh token as a secure httpOnly cookie
 * 7. Returns the access token + sanitised user object
 *
 * Invalid e-mail and invalid password return the same generic
 * INVALID_CREDENTIALS error to prevent user-enumeration attacks.
 */
import { db } from "@/lib/db";
import { AuthError, toErrorResponse } from "@/lib/auth/errors";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { jsonWithRefreshCookie } from "@/lib/auth/cookies";
import { parseBody, signInSchema } from "@/lib/auth/validation";
import { toAuthUser } from "@/lib/auth/public-user";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    // ── 1. Parse & validate ────────────────────────────────────────────────
    const body = await parseBody(request, signInSchema);

    // ── 2. Look up user ────────────────────────────────────────────────────
    const user = await db.orm.public.User.where({ email: body.email }).first();

    // Return the same error for unknown email and wrong password.
    if (!user) throw new AuthError("INVALID_CREDENTIALS");

    // ── 3. Verify password ─────────────────────────────────────────────────
    const passwordOk = await verifyPassword(body.password, user.passwordHash);
    if (!passwordOk) throw new AuthError("INVALID_CREDENTIALS");

    // ── 4. Guard account status ────────────────────────────────────────────
    if (user.status === "SUSPENDED") throw new AuthError("USER_SUSPENDED");
    if (user.status === "DELETED") throw new AuthError("USER_DELETED");

    // ── 5. Load profile for the response ──────────────────────────────────
    const profile = await db.orm.public.Profile.where({ userId: user.id }).first();

    // ── 6. Issue tokens ────────────────────────────────────────────────────
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id, user.email),
      signRefreshToken(user.id),
    ]);

    return jsonWithRefreshCookie(
      {
        ok: true,
        accessToken,
        user: await toAuthUser(user, profile),
      },
      refreshToken
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}

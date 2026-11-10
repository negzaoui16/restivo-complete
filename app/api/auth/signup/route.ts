/**
 * POST /api/auth/signup
 *
 * Creates a new user account.
 *
 * 1. Validates request body (email, password, name, optional phone, role)
 * 2. Checks e-mail uniqueness
 * 3. Hashes the password
 * 4. Creates User + Profile in a single transaction
 * 5. Issues an access token (15 min) and a refresh token (7 days)
 * 6. Sets the refresh token as a secure httpOnly cookie
 * 7. Returns the access token + sanitised user object
 *
 * The `role` field is an onboarding intent ("owner" | "staff" | "customer").
 * Owner and staff are stored on `User.managementRole`. Customer stays unset.
 * The chosen role is also echoed so the client can route after sign-up.
 */
import { db } from "@/lib/db";
import { AuthError, isPgUniqueViolation, toErrorResponse } from "@/lib/auth/errors";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { hashPassword } from "@/lib/auth/password";
import { jsonWithRefreshCookie } from "@/lib/auth/cookies";
import { parseBody, signUpSchema } from "@/lib/auth/validation";
import { signupRoleToManagementRole } from "@/lib/auth/access";
import { toAuthUser } from "@/lib/auth/public-user";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    // ── 1. Parse & validate ────────────────────────────────────────────────
    const body = await parseBody(request, signUpSchema);

    // ── 2. Check e-mail uniqueness ─────────────────────────────────────────
    const existing = await db.orm.public.User.where({ email: body.email }).first();
    if (existing) throw new AuthError("EMAIL_ALREADY_EXISTS");

    // ── 3. Hash password ───────────────────────────────────────────────────
    const passwordHash = await hashPassword(body.password);

    // ── 4. Persist User + Profile atomically ──────────────────────────────
    const user = await db.transaction(async (tx) => {
      const newUser = await tx.orm.public.User.create({
        email: body.email,
        passwordHash,
        managementRole: signupRoleToManagementRole(body.role),
      });

      await tx.orm.public.Profile.create({
        userId: newUser.id,
        firstName: body.firstName,
        lastName: body.lastName,
        displayName: `${body.firstName} ${body.lastName}`.trim(),
        phone: body.phone ?? null,
      });

      return newUser;
    });

    // ── 5. Issue tokens ────────────────────────────────────────────────────
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id, user.email),
      signRefreshToken(user.id),
    ]);

    const publicUser = await toAuthUser(user, {
      firstName: body.firstName,
      lastName: body.lastName,
      displayName: `${body.firstName} ${body.lastName}`.trim(),
      avatarUrl: null,
    });

    return jsonWithRefreshCookie(
      {
        ok: true,
        accessToken,
        user: publicUser,
        role: body.role,
      },
      refreshToken,
      201
    );
  } catch (err) {
    // Map pg unique-violation to a typed AuthError when the ORM surfaces it
    // before our explicit uniqueness check (e.g. race condition).
    if (isPgUniqueViolation(err)) {
      return toErrorResponse(new AuthError("EMAIL_ALREADY_EXISTS"));
    }
    return toErrorResponse(err);
  }
}

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's public profile.
 *
 * Expects the access token in the Authorization header:
 *   Authorization: Bearer <accessToken>
 *
 * The route re-fetches the user and their profile from the database on every
 * call so the data is always fresh (no stale JWT payload).  The access token
 * is only used for authentication, not as a data source.
 */
import { db } from "@/lib/db";
import { AuthError, toErrorResponse } from "@/lib/auth/errors";
import { requireUserId } from "@/lib/auth/session";
import { toAuthUser } from "@/lib/auth/public-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const userId = await requireUserId(request);

    const [user, profile] = await Promise.all([
      db.orm.public.User.where({ id: userId }).first(),
      db.orm.public.Profile.where({ userId }).first(),
    ]);

    if (!user) throw new AuthError("INVALID_TOKEN");
    if (user.status === "SUSPENDED") throw new AuthError("USER_SUSPENDED");
    if (user.status === "DELETED") throw new AuthError("USER_DELETED");

    return Response.json({
      ok: true,
      user: {
        ...(await toAuthUser(user, profile)),
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
        phone: profile?.phone ?? null,
        bio: profile?.bio ?? null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

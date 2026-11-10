/**
 * PATCH /api/auth/profile
 *
 * Updates the authenticated user's Profile row (names, phone, bio).
 * Email lives on User and is not changed here.
 *
 * If a Profile row is missing (legacy accounts), one is created.
 */
import { db } from "@/lib/db";
import { AuthError, toErrorResponse } from "@/lib/auth/errors";
import { requireUserId } from "@/lib/auth/session";
import { parseBody, updateProfileSchema } from "@/lib/auth/validation";
import { toAuthUser } from "@/lib/auth/public-user";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request): Promise<Response> {
  try {
    const userId = await requireUserId(request);
    const body = await parseBody(request, updateProfileSchema);

    const user = await db.orm.public.User.where({ id: userId }).first();
    if (!user) throw new AuthError("INVALID_TOKEN");
    if (user.status === "SUSPENDED") throw new AuthError("USER_SUSPENDED");
    if (user.status === "DELETED") throw new AuthError("USER_DELETED");

    const firstName = body.firstName;
    const lastName = body.lastName;
    const displayName =
      body.displayName && body.displayName.length > 0
        ? body.displayName
        : `${firstName} ${lastName}`.trim();
    const phone = body.phone && body.phone.length > 0 ? body.phone : null;
    const bio = body.bio && body.bio.trim().length > 0 ? body.bio.trim() : null;

    const existing = await db.orm.public.Profile.where({ userId }).first();

    const profile = existing
      ? await db.orm.public.Profile.where({ userId }).update({
          firstName,
          lastName,
          displayName,
          phone,
          bio,
        })
      : await db.orm.public.Profile.create({
          userId,
          firstName,
          lastName,
          displayName,
          phone,
          bio,
        });

    return Response.json({
      ok: true,
      user: {
        ...(await toAuthUser(user, profile)),
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
        phone: profile?.phone ?? phone,
        bio: profile?.bio ?? bio,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

import { db } from "@/lib/db";
import { AuthError } from "@/lib/auth/errors";
import { requireActiveUser } from "@/lib/auth/active-user";
import { staffAccessVerdict } from "./service-rules";
import { resolveRestaurantAccess } from "@/lib/auth/access";

export async function requireStaffUser(request: Request) {
  const user = await requireActiveUser(request);

  const access = await resolveRestaurantAccess(user.id, user.managementRole ?? null);
  if (!access.isStaff) {
    throw new AuthError("FORBIDDEN", "Only staff can ask to join a restaurant.");
  }

  return user;
}

/**
 * Staff access to one restaurant's service board: an ACTIVE account with an ACTIVE STAFF
 * membership in THAT restaurant. Anything else is 403 (an unknown restaurant included, so
 * nothing leaks); a missing or invalid token is 401 and a suspended account 403 (requireActiveUser).
 */
export async function requireRestaurantStaff(request: Request, restaurantId: string) {
  const user = await requireActiveUser(request);
  const membership = await db.orm.public.RestaurantMembership.where({ userId: user.id, restaurantId }).first();
  const verdict = staffAccessVerdict(membership ? { role: membership.role, status: membership.status } : null);
  if (verdict !== "OK") {
    throw new AuthError("FORBIDDEN", "You are not an active staff member of this restaurant.");
  }
  return { user, restaurantId };
}

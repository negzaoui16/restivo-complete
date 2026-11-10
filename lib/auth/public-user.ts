/**
 * Shared user JSON shape returned by auth routes.
 */
import type { AuthUser } from "./client";
import { resolveRestaurantAccess, type MembershipRole } from "./access";

export async function toAuthUser(
  user: { id: string; email: string; managementRole?: MembershipRole | null },
  profile: {
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null
): Promise<AuthUser> {
  const access = await resolveRestaurantAccess(user.id, user.managementRole ?? null);

  return {
    id: user.id,
    email: user.email,
    firstName: profile?.firstName ?? null,
    lastName: profile?.lastName ?? null,
    displayName: profile?.displayName ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    canManageRestaurants: access.canManageRestaurants,
    managementRole: access.managementRole,
    isStaff: access.isStaff,
  };
}

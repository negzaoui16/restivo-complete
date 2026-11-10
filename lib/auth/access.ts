/**
 * Role access for the shared sidebar.
 *
 * Owner / Manager is granted when:
 *  - the account's `managementRole` is OWNER or MANAGER, or
 *  - they hold an ACTIVE RestaurantMembership with OWNER or MANAGER.
 *
 * Staff is granted when the account role is STAFF, or they hold an ACTIVE
 * membership with STAFF, and they are not already an owner or manager.
 */
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUserIdFromRefreshCookie } from "./session";

export type MembershipRole = "OWNER" | "MANAGER" | "STAFF";

export function isManagerRole(role: string | null | undefined): boolean {
  return role === "OWNER" || role === "MANAGER";
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "STAFF";
}

export interface RestaurantAccess {
  canManageRestaurants: boolean;
  managementRole: "OWNER" | "MANAGER" | null;
  isStaff: boolean;
}

export async function resolveRestaurantAccess(
  userId: string,
  accountRole: MembershipRole | null
): Promise<RestaurantAccess> {
  const memberships = await db.orm.public.RestaurantMembership.where({
    userId,
    status: "ACTIVE",
  }).all();

  const fromAccount = isManagerRole(accountRole);
  const fromMembership = memberships.some((row) => isManagerRole(row.role));
  const canManageRestaurants = fromAccount || fromMembership;

  let managementRole: "OWNER" | "MANAGER" | null = null;
  if (accountRole === "OWNER" || memberships.some((row) => row.role === "OWNER")) {
    managementRole = "OWNER";
  } else if (accountRole === "MANAGER" || memberships.some((row) => row.role === "MANAGER")) {
    managementRole = "MANAGER";
  }

  const isStaff =
    !canManageRestaurants &&
    (isStaffRole(accountRole) || memberships.some((row) => isStaffRole(row.role)));

  return { canManageRestaurants, managementRole, isStaff };
}

export function signupRoleToManagementRole(
  role: "owner" | "staff" | "customer"
): MembershipRole | null {
  if (role === "owner") return "OWNER";
  if (role === "staff") return "STAFF";
  return null;
}

/** Server-page gate for Owner/Manager surfaces. */
export async function requireRestaurantManager(): Promise<void> {
  const userId = await getUserIdFromRefreshCookie();
  if (!userId) redirect("/auth/signin");

  const user = await db.orm.public.User.where({ id: userId }).first();
  if (!user) redirect("/auth/signin");

  const access = await resolveRestaurantAccess(user.id, user.managementRole ?? null);
  if (!access.canManageRestaurants) redirect("/mainpage");
}

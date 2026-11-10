import { db } from "@/lib/db";
import { AuthError } from "@/lib/auth/errors";
import { requireActiveUser } from "@/lib/auth/active-user";
import { resolveRestaurantAccess, type RestaurantAccess } from "@/lib/auth/access";
import { RestaurantError } from "@/lib/restaurants/errors";

type UserRow = {
  id: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  managementRole: "OWNER" | "MANAGER" | "STAFF" | null;
};

export async function requireRestaurantManagerUser(request: Request): Promise<{
  user: UserRow;
  access: RestaurantAccess;
}> {
  const user = await requireActiveUser(request);

  const access = await resolveRestaurantAccess(user.id, user.managementRole ?? null);
  if (!access.canManageRestaurants) {
    throw new AuthError("FORBIDDEN", "Only owners and managers can manage restaurants.");
  }

  return { user, access };
}

export async function canManageRestaurant(userId: string, restaurantId: string): Promise<boolean> {
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  if (!restaurant) return false;
  return (await managementRole(userId, restaurant)) !== null;
}

async function managementRole(
  userId: string,
  restaurant: { id: string; ownerId: string }
): Promise<"OWNER" | "MANAGER" | null> {
  if (restaurant.ownerId === userId) return "OWNER";

  const membership = await db.orm.public.RestaurantMembership.where({
    userId,
    restaurantId: restaurant.id,
    status: "ACTIVE",
  }).first();

  if (membership?.role === "OWNER" || membership?.role === "MANAGER") return membership.role;
  return null;
}

export async function requireManagedRestaurant(
  request: Request,
  restaurantId: string
): Promise<{
  user: UserRow;
  restaurant: { id: string; ownerId: string; name: string };
  role: "OWNER" | "MANAGER";
}> {
  const { user } = await requireRestaurantManagerUser(request);
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  if (!restaurant) {
    throw new RestaurantError("NOT_FOUND", "Restaurant not found.");
  }

  const role = await managementRole(user.id, restaurant);
  if (!role) throw new AuthError("FORBIDDEN", "You cannot manage this restaurant.");
  return { user, restaurant, role };
}

/**
 * A customer's favorite restaurants. The customer is always the signed-in user.
 */
import { db } from "@/lib/db";
import { isPgUniqueViolation } from "@/lib/auth/errors";
import { RestaurantError } from "@/lib/restaurants/errors";

/** The ids of every restaurant the user marked, from one query. */
export async function favoriteIds(userId: string): Promise<Set<string>> {
  const rows = await db.orm.public.Favorite.where({ userId }).all();
  return new Set(rows.map((row) => row.restaurantId));
}

/** Adds a restaurant to the favorites; adding it twice is not an error. */
export async function addFavorite(userId: string, restaurantId: string): Promise<void> {
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  if (!restaurant || restaurant.status !== "ACTIVE") throw new RestaurantError("NOT_FOUND", "Restaurant not found.");

  const existing = await db.orm.public.Favorite.where({ userId, restaurantId }).first();
  if (existing) return;

  try {
    await db.transaction(async (tx) => {
      const row = await tx.orm.public.Favorite.create({ userId, restaurantId });
      await tx.orm.public.AuditLog.create({
        userId,
        restaurantId,
        action: "CREATE",
        entityType: "Favorite",
        entityId: row.id,
      });
    });
  } catch (err) {
    if (!isPgUniqueViolation(err)) throw err; // two requests at once: the pair is already there
  }
}

/** Removes a restaurant from the favorites; removing one that is not there is not an error. */
export async function removeFavorite(userId: string, restaurantId: string): Promise<void> {
  const existing = await db.orm.public.Favorite.where({ userId, restaurantId }).first();
  if (!existing) return;
  await db.transaction(async (tx) => {
    await tx.orm.public.Favorite.where({ id: existing.id }).delete();
    await tx.orm.public.AuditLog.create({
      userId,
      restaurantId,
      action: "DELETE",
      entityType: "Favorite",
      entityId: existing.id,
    });
  });
}

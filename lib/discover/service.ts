/**
 * Customer-facing reads. A restaurant is discoverable when it is ACTIVE and
 * has at least one active floor holding at least one active table (the same
 * rule that gates publication).
 */
import { db } from "@/lib/db";
import { RestaurantError } from "@/lib/restaurants/errors";
import { publishBlocker } from "@/lib/restaurants/publish";
import { listFloors } from "@/lib/floors/service";
import { favoriteIds } from "@/lib/favorites/service";
import { NO_RATING, ratingSummaries } from "@/lib/reviews/service";
import type { RatingSummary } from "@/lib/reviews/rules";
import { distinctCuisines, matchesFilters, matchesQuery } from "./search";
import type {
  DiscoverFloor,
  DiscoverHours,
  DiscoverList,
  DiscoverRestaurantDetail,
  DiscoverRestaurantSummary,
  DiscoverTable,
} from "./types";

type RestaurantRow = NonNullable<Awaited<ReturnType<typeof findRestaurant>>>;

async function findRestaurant(id: string) {
  return db.orm.public.Restaurant.where({ id }).first();
}

async function activeTables(floorId: string): Promise<DiscoverTable[]> {
  const rows = await db.orm.public.Table.where({ floorId, isActive: true }).all();
  return rows
    .map((row) => ({ id: row.id, floorId, name: row.name, capacity: row.capacity }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** Active floors with their active tables, or null when not bookable. */
async function bookableFloors(restaurantId: string) {
  const floors = (await listFloors(restaurantId)).filter((floor) => floor.isActive);
  const tables = (await Promise.all(floors.map((floor) => activeTables(floor.id)))).flat();
  const blocker = publishBlocker(
    floors.map((floor) => ({
      isActive: floor.isActive,
      activeTableCount: tables.filter((table) => table.floorId === floor.id).length,
    })),
  );
  return blocker ? null : { floors, tables };
}

/** Active tables on active floors; the tables a customer can book. */
export async function listBookableTables(restaurantId: string): Promise<DiscoverTable[]> {
  const floors = await db.orm.public.Floor.where({ restaurantId }).all();
  const active = floors.filter((floor) => floor.isActive);
  return (await Promise.all(active.map((floor) => activeTables(floor.id)))).flat();
}

function toSummary(
  row: RestaurantRow,
  extras: { rating: RatingSummary; isFavorite: boolean },
): DiscoverRestaurantSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    city: row.city,
    coverUrl: row.coverUrl,
    logoUrl: row.logoUrl,
    cuisine: row.cuisine,
    priceLevel: row.priceLevel,
    currency: row.currency,
    averageRating: extras.rating.average,
    reviewCount: extras.rating.count,
    isFavorite: extras.isFavorite,
  };
}

export async function listDiscoverRestaurants(
  userId: string,
  query: string,
  filters: { cuisine?: string; price?: number[] } = {},
): Promise<DiscoverList> {
  // Ratings and favorites each come from one query, whatever the number of restaurants.
  const [rows, ratings, favorites] = await Promise.all([
    db.orm.public.Restaurant.where({ status: "ACTIVE" }).all(),
    ratingSummaries(),
    favoriteIds(userId),
  ]);
  // Filters run on the rows already in memory, before the per-restaurant floor lookups.
  const matching = rows
    .filter((row) => matchesQuery(row, query) && matchesFilters(row, filters))
    .sort((a, b) => a.name.localeCompare(b.name));

  const result: DiscoverRestaurantSummary[] = [];
  for (const row of matching) {
    if (await bookableFloors(row.id)) {
      result.push(toSummary(row, { rating: ratings.get(row.id) ?? NO_RATING, isFavorite: favorites.has(row.id) }));
    }
  }
  return { restaurants: result, cuisines: distinctCuisines(rows.map((row) => row.cuisine)) };
}

/** The customer's favorites that can still be booked, in alphabetical order. */
export async function listFavoriteRestaurants(userId: string): Promise<DiscoverRestaurantSummary[]> {
  const [ids, ratings] = await Promise.all([favoriteIds(userId), ratingSummaries()]);
  const result: DiscoverRestaurantSummary[] = [];
  for (const id of ids) {
    const row = await findRestaurant(id);
    if (!row || row.status !== "ACTIVE" || !(await bookableFloors(row.id))) continue;
    result.push(toSummary(row, { rating: ratings.get(row.id) ?? NO_RATING, isFavorite: true }));
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDiscoverRestaurant(id: string, userId: string): Promise<DiscoverRestaurantDetail> {
  const row = await findRestaurant(id);
  if (!row || row.status !== "ACTIVE") {
    throw new RestaurantError("NOT_FOUND", "Restaurant not found.");
  }
  const bookable = await bookableFloors(row.id);
  if (!bookable) throw new RestaurantError("NOT_FOUND", "Restaurant not found.");

  const hoursRows = await db.orm.public.BusinessHours.where({ restaurantId: row.id }).all();
  const hours: DiscoverHours[] = hoursRows
    .map((day) => ({
      dayOfWeek: day.dayOfWeek,
      isClosed: day.isClosed,
      openTime: day.openTime,
      closeTime: day.closeTime,
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const floors: DiscoverFloor[] = bookable.floors.map((floor) => ({
    id: floor.id,
    name: floor.name,
    width: floor.width,
    height: floor.height,
    objects: floor.objects,
  }));

  const [ratings, favorites] = await Promise.all([ratingSummaries(), favoriteIds(userId)]);

  return {
    ...toSummary(row, { rating: ratings.get(row.id) ?? NO_RATING, isFavorite: favorites.has(row.id) }),
    address: row.address,
    phone: row.phone,
    website: row.website,
    currency: row.currency,
    timezone: row.timezone,
    hours,
    floors,
    tables: bookable.tables,
  };
}

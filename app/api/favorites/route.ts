/**
 * GET  /api/favorites                  — the signed-in customer's favorite restaurants
 * POST /api/favorites { restaurantId } — add one (adding twice is fine)
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { listFavoriteRestaurants } from "@/lib/discover/service";
import { addFavorite } from "@/lib/favorites/service";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { parseRestaurantBody } from "@/lib/restaurants/validation";
import { z } from "zod";

export const dynamic = "force-dynamic";

const addSchema = z.object({ restaurantId: z.string().trim().min(1, "Choose a restaurant.").max(40) });

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    return Response.json({ ok: true, restaurants: await listFavoriteRestaurants(user.id) });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const { restaurantId } = await parseRestaurantBody(request, addSchema);
    await addFavorite(user.id, restaurantId);
    return Response.json({ ok: true, isFavorite: true }, { status: 201 });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

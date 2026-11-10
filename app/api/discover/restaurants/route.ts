/**
 * GET /api/discover/restaurants?q=&cuisine=&price=1,2 — published restaurants, filtered by name or city,
 * cuisine (part of the text) and price levels. Also returns the cuisines available for filter chips.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { listDiscoverRestaurants } from "@/lib/discover/service";
import { parseDiscoverQuery } from "@/lib/discover/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const { q, cuisine, price } = parseDiscoverQuery(request.url);
    const { restaurants, cuisines } = await listDiscoverRestaurants(user.id, q, { cuisine, price });
    return Response.json({ ok: true, restaurants, cuisines });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

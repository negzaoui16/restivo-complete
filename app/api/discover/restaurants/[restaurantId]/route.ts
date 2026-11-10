/**
 * GET /api/discover/restaurants/:id — info, hours, active floors and tables.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { getDiscoverRestaurant } from "@/lib/discover/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const { restaurantId } = await context.params;
    const restaurant = await getDiscoverRestaurant(restaurantId, user.id);
    return Response.json({ ok: true, restaurant });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

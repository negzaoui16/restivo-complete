/**
 * GET /api/restaurants/:id/hours — the 7 weekly days (0 = Sunday).
 * PUT /api/restaurants/:id/hours — replace them: { hours: [7 days] }.
 *
 * A day with closeTime before openTime closes the next day (12:00 to 03:00);
 * equal times are refused. Owner or manager of this restaurant.
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { getBusinessHours, updateBusinessHours } from "@/lib/restaurants/service";
import { parseRestaurantBody, updateHoursSchema } from "@/lib/restaurants/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireManagedRestaurant(request, restaurantId);
    return Response.json({ ok: true, hours: await getBusinessHours(restaurantId) });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseRestaurantBody(request, updateHoursSchema);
    return Response.json({ ok: true, hours: await updateBusinessHours(user.id, restaurantId, body) });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

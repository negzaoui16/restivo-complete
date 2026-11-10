/**
 * PATCH /api/restaurants/:id/status — publish (ACTIVE) or unpublish (DRAFT)
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { setRestaurantStatus } from "@/lib/restaurants/service";
import { parseRestaurantBody, updateStatusSchema } from "@/lib/restaurants/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseRestaurantBody(request, updateStatusSchema);
    const restaurant = await setRestaurantStatus(user.id, restaurantId, body.status);
    return Response.json({ ok: true, restaurant });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

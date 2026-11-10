/**
 * PATCH /api/restaurants/:id/floors/:floorId/active  { isActive }
 * Switches a floor on or off. 409 FLOOR_HAS_RESERVATIONS while a reservation holds one of its
 * tables, 409 LAST_ACTIVE_FLOOR for the last floor of a published restaurant.
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { setFloorActive } from "@/lib/floors/service";
import { floorActiveSchema, parseFloorBody } from "@/lib/floors/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; floorId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, floorId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const { isActive } = await parseFloorBody(request, floorActiveSchema);
    const floors = await setFloorActive(user.id, restaurantId, floorId, isActive);
    return Response.json({ ok: true, floors });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

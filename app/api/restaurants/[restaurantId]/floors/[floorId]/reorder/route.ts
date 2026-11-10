import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { reorderFloor } from "@/lib/floors/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; floorId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, floorId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const floors = await reorderFloor(user.id, restaurantId, floorId);
    return Response.json({ ok: true, floors });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

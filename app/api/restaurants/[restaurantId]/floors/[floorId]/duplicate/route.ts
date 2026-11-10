import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { duplicateFloor } from "@/lib/floors/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; floorId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, floorId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const floor = await duplicateFloor(user.id, restaurantId, floorId);
    return Response.json({ ok: true, floor }, { status: 201 });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

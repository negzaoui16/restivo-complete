import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { deleteFloor, updateFloor } from "@/lib/floors/service";
import { parseFloorBody, updateFloorSchema } from "@/lib/floors/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; floorId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, floorId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseFloorBody(request, updateFloorSchema);
    const floor = await updateFloor(user.id, restaurantId, floorId, body);
    return Response.json({ ok: true, floor });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, floorId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const floors = await deleteFloor(user.id, restaurantId, floorId);
    return Response.json({ ok: true, floors });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { saveLayout } from "@/lib/floors/service";
import { parseFloorBody, saveLayoutSchema } from "@/lib/floors/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; floorId: string }> };

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, floorId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseFloorBody(request, saveLayoutSchema);
    const floor = await saveLayout(user.id, restaurantId, floorId, body);
    return Response.json({ ok: true, floor });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

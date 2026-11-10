import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { createFloor, listFloors } from "@/lib/floors/service";
import { createFloorSchema, parseFloorBody } from "@/lib/floors/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireManagedRestaurant(request, restaurantId);
    const floors = await listFloors(restaurantId);
    return Response.json({ ok: true, floors });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseFloorBody(request, createFloorSchema);
    const floor = await createFloor(user.id, restaurantId, body);
    return Response.json({ ok: true, floor }, { status: 201 });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

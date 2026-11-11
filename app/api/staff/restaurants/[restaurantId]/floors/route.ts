import { requireRestaurantStaff } from "@/lib/staff/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { listFloors } from "@/lib/floors/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireRestaurantStaff(request, restaurantId);
    const floors = await listFloors(restaurantId);
    return Response.json({ ok: true, floors });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

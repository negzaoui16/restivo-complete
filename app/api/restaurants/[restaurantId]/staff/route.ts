import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { loadRoster } from "@/lib/staff/roster";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireManagedRestaurant(request, restaurantId);
    const roster = await loadRoster(restaurantId);
    return Response.json({ ok: true, roster });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

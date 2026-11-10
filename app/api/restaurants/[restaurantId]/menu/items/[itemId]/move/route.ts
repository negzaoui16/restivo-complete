import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { moveItem } from "@/lib/menu/service";
import { parseMenuBody, reorderSchema } from "@/lib/menu/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; itemId: string }> };

/** POST { direction: "up" | "down" } — moves one step; the response is the full menu. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, itemId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const { direction } = await parseMenuBody(request, reorderSchema);
    const menu = await moveItem(user.id, restaurantId, itemId, direction);
    return Response.json({ ok: true, menu });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

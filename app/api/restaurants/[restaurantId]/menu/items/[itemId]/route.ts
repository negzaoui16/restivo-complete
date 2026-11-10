import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { deleteItem, updateItem } from "@/lib/menu/service";
import { parseMenuBody, updateItemSchema } from "@/lib/menu/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; itemId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, itemId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseMenuBody(request, updateItemSchema);
    const menu = await updateItem(user.id, restaurantId, itemId, body);
    return Response.json({ ok: true, menu });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, itemId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const menu = await deleteItem(user.id, restaurantId, itemId);
    return Response.json({ ok: true, menu });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

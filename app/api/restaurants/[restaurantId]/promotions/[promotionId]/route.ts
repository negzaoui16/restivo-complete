import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { deletePromotion, updatePromotion } from "@/lib/menu/service";
import { parseMenuBody, updatePromotionSchema } from "@/lib/menu/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; promotionId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, promotionId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseMenuBody(request, updatePromotionSchema);
    const menu = await updatePromotion(user.id, restaurantId, promotionId, body);
    return Response.json({ ok: true, menu });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, promotionId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const menu = await deletePromotion(user.id, restaurantId, promotionId);
    return Response.json({ ok: true, menu });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

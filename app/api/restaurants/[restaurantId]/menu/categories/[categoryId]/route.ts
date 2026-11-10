import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { deleteCategory, updateCategory } from "@/lib/menu/service";
import { parseMenuBody, updateCategorySchema } from "@/lib/menu/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; categoryId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, categoryId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseMenuBody(request, updateCategorySchema);
    const menu = await updateCategory(user.id, restaurantId, categoryId, body);
    return Response.json({ ok: true, menu });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, categoryId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const menu = await deleteCategory(user.id, restaurantId, categoryId);
    return Response.json({ ok: true, menu });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

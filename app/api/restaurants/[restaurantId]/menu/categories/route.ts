import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { createCategory } from "@/lib/menu/service";
import { createCategorySchema, parseMenuBody } from "@/lib/menu/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseMenuBody(request, createCategorySchema);
    const menu = await createCategory(user.id, restaurantId, body);
    return Response.json({ ok: true, menu }, { status: 201 });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

/**
 * GET  /api/restaurants/:id/menu — current menu tree, or null
 * POST /api/restaurants/:id/menu — create the restaurant's menu
 * PATCH /api/restaurants/:id/menu — update name / publish
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { createMenu, getMenuTree, updateMenu } from "@/lib/menu/service";
import { createMenuSchema, parseMenuBody, updateMenuSchema } from "@/lib/menu/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireManagedRestaurant(request, restaurantId);
    const menu = await getMenuTree(restaurantId);
    return Response.json({ ok: true, menu });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseMenuBody(request, createMenuSchema);
    const menu = await createMenu(user.id, restaurantId, body);
    return Response.json({ ok: true, menu }, { status: 201 });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseMenuBody(request, updateMenuSchema);
    const menu = await updateMenu(user.id, restaurantId, body);
    return Response.json({ ok: true, menu });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

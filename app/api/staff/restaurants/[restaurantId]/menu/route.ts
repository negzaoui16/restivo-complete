import { requireRestaurantStaff } from "@/lib/staff/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { getMenuTree } from "@/lib/menu/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireRestaurantStaff(request, restaurantId);
    const menu = await getMenuTree(restaurantId);
    return Response.json({ ok: true, menu });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

/**
 * GET /api/discover/restaurants/:id/menu — published menu with live promotions applied
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { toOrderErrorResponse } from "@/lib/orders/errors";
import { getDiscoverMenu } from "@/lib/orders/menu";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    await requireActiveUser(request);
    const { restaurantId } = await context.params;
    const menu = await getDiscoverMenu(restaurantId);
    return Response.json({ ok: true, ...menu });
  } catch (err) {
    return toOrderErrorResponse(err);
  }
}

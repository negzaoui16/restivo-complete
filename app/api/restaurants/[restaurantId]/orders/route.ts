/**
 * GET /api/restaurants/:id/orders?status=A,B&reservationId=&date=YYYY-MM-DD
 * Manager view of a restaurant's pre-orders: lines, subtotal, discount, total.
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { listOrders } from "@/lib/manager/service";
import { orderListSchema, parseManagerQuery } from "@/lib/manager/validation";
import { toReservationErrorResponse } from "@/lib/reservations/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireManagedRestaurant(request, restaurantId);
    const query = parseManagerQuery(request, orderListSchema);
    return Response.json({ ok: true, ...(await listOrders(restaurantId, query)) });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

/**
 * GET /api/staff/restaurants/:id/orders
 * Today's kitchen orders (confirmed, preparing, ready, delivered) for the restaurant's STAFF, without prices.
 */
import { requireRestaurantStaff } from "@/lib/staff/access";
import { listStaffOrders } from "@/lib/staff/board-service";
import { toReservationErrorResponse } from "@/lib/reservations/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireRestaurantStaff(request, restaurantId);
    return Response.json({ ok: true, ...(await listStaffOrders(restaurantId)) });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

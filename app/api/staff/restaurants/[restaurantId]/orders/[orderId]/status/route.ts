/**
 * PATCH /api/staff/restaurants/:id/orders/:orderId/status  { status: "PREPARING" | "READY" | "DELIVERED" }
 * Staff move an order along the kitchen steps. 403 for any other status, 409 for a forbidden step.
 */
import { requireRestaurantStaff } from "@/lib/staff/access";
import { setStaffOrderStatus } from "@/lib/staff/board-service";
import { orderStatusSchema, parseManagerBody } from "@/lib/manager/validation";
import { toReservationErrorResponse } from "@/lib/reservations/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; orderId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, orderId } = await context.params;
    const { user } = await requireRestaurantStaff(request, restaurantId);
    const { status } = await parseManagerBody(request, orderStatusSchema);
    const order = await setStaffOrderStatus(user.id, restaurantId, orderId, status);
    return Response.json({ ok: true, order: { id: order.id, status: order.status } });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

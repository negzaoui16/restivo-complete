/**
 * PATCH /api/restaurants/:id/orders/:orderId/status  { status }
 * Manager moves a pre-order along PENDING > CONFIRMED > PREPARING > READY > DELIVERED,
 * or cancels it before delivery. 409 for a forbidden change.
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { changeOrderStatus } from "@/lib/manager/service";
import { orderStatusSchema, parseManagerBody } from "@/lib/manager/validation";
import { toReservationErrorResponse } from "@/lib/reservations/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; orderId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, orderId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const { status } = await parseManagerBody(request, orderStatusSchema);
    const order = await changeOrderStatus(user.id, restaurantId, orderId, status);
    return Response.json({ ok: true, order });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

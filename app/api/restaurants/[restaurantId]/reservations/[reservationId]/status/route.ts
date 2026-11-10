/**
 * PATCH /api/restaurants/:id/reservations/:reservationId/status  { status }
 * Manager moves a reservation along its lifecycle. 409 for a forbidden or
 * too-early/too-late change; cancelling also cancels PENDING/CONFIRMED pre-orders.
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { changeReservationStatus } from "@/lib/manager/service";
import { parseManagerBody, reservationStatusSchema } from "@/lib/manager/validation";
import { toReservationErrorResponse } from "@/lib/reservations/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; reservationId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, reservationId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const { status } = await parseManagerBody(request, reservationStatusSchema);
    const change = await changeReservationStatus(user.id, restaurantId, reservationId, status);
    return Response.json({ ok: true, ...change });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

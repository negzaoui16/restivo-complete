/**
 * PATCH /api/staff/restaurants/:id/reservations/:reservationId/status  { status: "SEATED" | "COMPLETED" }
 * Staff seat or complete a reservation. Same transition rules as the manager; 403 for any other status.
 */
import { requireRestaurantStaff } from "@/lib/staff/access";
import { setStaffReservationStatus } from "@/lib/staff/board-service";
import { parseManagerBody, reservationStatusSchema } from "@/lib/manager/validation";
import { toReservationErrorResponse } from "@/lib/reservations/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; reservationId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, reservationId } = await context.params;
    const { user } = await requireRestaurantStaff(request, restaurantId);
    const { status } = await parseManagerBody(request, reservationStatusSchema);
    const reservation = await setStaffReservationStatus(user.id, restaurantId, reservationId, status);
    return Response.json({ ok: true, reservation: { id: reservation.id, status: reservation.status } });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

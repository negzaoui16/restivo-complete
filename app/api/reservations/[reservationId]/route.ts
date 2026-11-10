/**
 * PATCH /api/reservations/:id — the customer changes date, time, table, guests or notes of an
 * upcoming CONFIRMED or PENDING reservation, with the same rules as a booking. Its pre-orders stay.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { toReservationErrorResponse } from "@/lib/reservations/errors";
import { updateReservation } from "@/lib/reservations/service";
import { parseReservationBody, updateReservationSchema } from "@/lib/reservations/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ reservationId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const { reservationId } = await context.params;
    const body = await parseReservationBody(request, updateReservationSchema);
    const reservation = await updateReservation(user.id, reservationId, body);
    return Response.json({ ok: true, reservation });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

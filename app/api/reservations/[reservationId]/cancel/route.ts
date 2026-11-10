/**
 * POST /api/reservations/:id/cancel — the owner cancels an upcoming reservation.
 * Its PENDING or CONFIRMED pre-orders are cancelled in the same transaction.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { toReservationErrorResponse } from "@/lib/reservations/errors";
import { cancelReservation } from "@/lib/reservations/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ reservationId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const { reservationId } = await context.params;
    const { reservation, cancelledOrders } = await cancelReservation(user.id, reservationId);
    return Response.json({ ok: true, reservation, cancelledOrders });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

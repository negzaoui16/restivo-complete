/**
 * GET /api/staff/restaurants/:id/reservations
 * Today's reservations for the restaurant's STAFF (no totals, no cancelled or missed ones).
 */
import { requireRestaurantStaff } from "@/lib/staff/access";
import { listStaffReservations } from "@/lib/staff/board-service";
import { toReservationErrorResponse } from "@/lib/reservations/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireRestaurantStaff(request, restaurantId);
    return Response.json({ ok: true, ...(await listStaffReservations(restaurantId)) });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

/**
 * GET /api/restaurants/:id/reservations?date=YYYY-MM-DD | from=&to=&status=A,B
 * Manager view of a restaurant's reservations (today by default), sorted by time,
 * with table, customer name, guests and linked pre-orders.
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { listReservations } from "@/lib/manager/service";
import { parseManagerQuery, reservationListSchema } from "@/lib/manager/validation";
import { toReservationErrorResponse } from "@/lib/reservations/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireManagedRestaurant(request, restaurantId);
    const query = parseManagerQuery(request, reservationListSchema);
    return Response.json({ ok: true, ...(await listReservations(restaurantId, query)) });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

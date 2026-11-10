/**
 * GET /api/restaurants/:id/live
 * The live state of every table of the active floors, with the current and next reservation.
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { getLiveState } from "@/lib/live/service";
import { toReservationErrorResponse } from "@/lib/reservations/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireManagedRestaurant(request, restaurantId);
    return Response.json({ ok: true, live: await getLiveState(restaurantId) });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

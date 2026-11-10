/**
 * GET /api/restaurants/:id/stats?date=YYYY-MM-DD
 * Dashboard counters for one local day (today by default): reservations, covers,
 * orders to process, and revenue of non-cancelled orders as an exact decimal string.
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { getStats } from "@/lib/manager/service";
import { parseManagerQuery, statsQuerySchema } from "@/lib/manager/validation";
import { toReservationErrorResponse } from "@/lib/reservations/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireManagedRestaurant(request, restaurantId);
    const { date } = parseManagerQuery(request, statsQuerySchema);
    return Response.json({ ok: true, stats: await getStats(restaurantId, date) });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

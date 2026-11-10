/**
 * GET /api/restaurants/:id/activity — latest reservation and order events (AuditLog).
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { listActivity } from "@/lib/manager/service";
import { toReservationErrorResponse } from "@/lib/reservations/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireManagedRestaurant(request, restaurantId);
    return Response.json({ ok: true, activity: await listActivity(restaurantId) });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

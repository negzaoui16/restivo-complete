/**
 * GET /api/discover/restaurants/:id/availability?date=YYYY-MM-DD&time=HH:MM&guests=
 *
 * Date and time are in the restaurant timezone. With `&exclude=<reservationId>` (the customer's
 * own reservation, while changing it) that reservation does not count as taken.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { toReservationErrorResponse } from "@/lib/reservations/errors";
import { getAvailability } from "@/lib/reservations/service";
import { parseAvailabilityQuery } from "@/lib/reservations/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const { restaurantId } = await context.params;
    const query = parseAvailabilityQuery(request.url);
    const exclude = new URL(request.url).searchParams.get("exclude");
    const availability = await getAvailability(
      restaurantId,
      query.date,
      query.time,
      query.guests,
      exclude ? { reservationId: exclude, userId: user.id } : undefined,
    );
    return Response.json({ ok: true, availability });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

/**
 * POST /api/reservations/:id/review  { rating: 1-5, comment?: string (max 1000) }
 * The customer reviews their own COMPLETED reservation, once. 409 otherwise.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { toReservationErrorResponse } from "@/lib/reservations/errors";
import { parseReservationBody } from "@/lib/reservations/validation";
import { createReview } from "@/lib/reviews/service";
import { createReviewSchema } from "@/lib/reviews/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ reservationId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const { reservationId } = await context.params;
    const body = await parseReservationBody(request, createReviewSchema);
    const review = await createReview(user.id, reservationId, body);
    return Response.json({ ok: true, review }, { status: 201 });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

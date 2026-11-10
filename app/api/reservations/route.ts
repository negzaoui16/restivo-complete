/**
 * POST /api/reservations — book a table (status CONFIRMED)
 * GET  /api/reservations — the signed-in customer's reservations
 *
 * The customer is always the JWT subject, never a body field.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { toReservationErrorResponse } from "@/lib/reservations/errors";
import { createReservation, listMyReservations } from "@/lib/reservations/service";
import { createReservationSchema, parseReservationBody } from "@/lib/reservations/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const body = await parseReservationBody(request, createReservationSchema);
    const reservation = await createReservation(user.id, body);
    return Response.json({ ok: true, reservation }, { status: 201 });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const reservations = await listMyReservations(user.id);
    return Response.json({ ok: true, reservations });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

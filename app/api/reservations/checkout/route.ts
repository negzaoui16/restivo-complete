/**
 * POST /api/reservations/checkout — book a table and, optionally, pre-order
 * dishes in one transaction. Nothing is saved unless everything succeeds.
 *
 * The customer is always the JWT subject, never a body field.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { OrderError, toOrderErrorResponse } from "@/lib/orders/errors";
import { checkout } from "@/lib/reservations/checkout";
import { toReservationErrorResponse } from "@/lib/reservations/errors";
import { checkoutSchema, parseReservationBody } from "@/lib/reservations/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const body = await parseReservationBody(request, checkoutSchema);
    const result = await checkout(user.id, body);
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) return toOrderErrorResponse(err);
    return toReservationErrorResponse(err);
  }
}

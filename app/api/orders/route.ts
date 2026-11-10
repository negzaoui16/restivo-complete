/**
 * POST /api/orders — pre-order dishes on one of the customer's upcoming reservations
 * GET  /api/orders — the signed-in customer's orders (optional ?reservationId=)
 *
 * The customer is the JWT subject. Only dish ids and quantities are read from
 * the body: prices and promotions are always computed on the server.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { toOrderErrorResponse } from "@/lib/orders/errors";
import { createOrder, listMyOrders } from "@/lib/orders/service";
import { createOrderSchema, parseOrderBody, parseReservationFilter } from "@/lib/orders/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const body = await parseOrderBody(request, createOrderSchema);
    const order = await createOrder(user.id, body);
    return Response.json({ ok: true, order }, { status: 201 });
  } catch (err) {
    return toOrderErrorResponse(err);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const orders = await listMyOrders(user.id, parseReservationFilter(request.url));
    return Response.json({ ok: true, orders });
  } catch (err) {
    return toOrderErrorResponse(err);
  }
}

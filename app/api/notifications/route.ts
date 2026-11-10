/**
 * GET /api/notifications — the signed-in user's latest notifications and unread count.
 * The user is always the JWT subject.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { toReservationErrorResponse } from "@/lib/reservations/errors";
import { listNotifications } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    return Response.json({ ok: true, ...(await listNotifications(user.id)) });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

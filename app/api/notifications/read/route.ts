/**
 * POST /api/notifications/read — body { ids: string[] } or { all: true }.
 * Only the signed-in user's own notifications are marked.
 */
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth/active-user";
import { parseManagerBody } from "@/lib/manager/validation";
import { toReservationErrorResponse } from "@/lib/reservations/errors";
import { markNotificationsRead } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

const readSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.string().min(1)).min(1, "Choose a notification.").max(100) }),
]);

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const body = await parseManagerBody(request, readSchema);
    const result = await markNotificationsRead(user.id, "all" in body ? "all" : body.ids);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return toReservationErrorResponse(err);
  }
}

/**
 * PATCH /api/restaurants/:id/staff/:membershipId/role  { role: "MANAGER" | "STAFF" }
 * The owner of this restaurant names a staff member manager, or takes the role back.
 * 403 for anyone else, for the owner's own membership and for a self-promotion.
 */
import { z } from "zod";
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { parseRestaurantBody } from "@/lib/restaurants/validation";
import { changeTeamRole } from "@/lib/staff/roster";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; membershipId: string }> };

const roleSchema = z.object({ role: z.enum(["MANAGER", "STAFF"], { error: "Choose MANAGER or STAFF." }) });

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, membershipId } = await context.params;
    const { user, role } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseRestaurantBody(request, roleSchema);
    const member = await changeTeamRole({ id: user.id, role }, restaurantId, membershipId, body.role);
    return Response.json({ ok: true, member });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { reviewJoinRequest } from "@/lib/staff/roster";
import { parseReviewBody } from "@/lib/staff/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string; requestId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId, requestId } = await context.params;
    const { user } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseReviewBody(request);
    const review = await reviewJoinRequest(user.id, restaurantId, requestId, body.decision);
    return Response.json({ ok: true, review });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

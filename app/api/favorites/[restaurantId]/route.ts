/**
 * DELETE /api/favorites/:restaurantId — remove a restaurant from the favorites.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { removeFavorite } from "@/lib/favorites/service";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireActiveUser(request);
    const { restaurantId } = await context.params;
    await removeFavorite(user.id, restaurantId);
    return Response.json({ ok: true, isFavorite: false });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

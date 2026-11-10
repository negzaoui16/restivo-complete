/**
 * PATCH /api/restaurants/:id — edit the profile (name, description, address, city,
 * country, postal code, website, phone, email). Owner or manager of this restaurant.
 * The slug, currency and time zone do not change.
 */
import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { updateRestaurantProfile } from "@/lib/restaurants/service";
import { parseRestaurantBody, updateRestaurantSchema } from "@/lib/restaurants/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    const { user, role } = await requireManagedRestaurant(request, restaurantId);
    const body = await parseRestaurantBody(request, updateRestaurantSchema);
    const restaurant = await updateRestaurantProfile(user.id, restaurantId, role, body);
    return Response.json({ ok: true, restaurant });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

/**
 * GET  /api/restaurants  — restaurants this owner/manager can manage
 * POST /api/restaurants  — create a restaurant (OWNER/MANAGER accounts only)
 */
import { requireRestaurantManagerUser } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { createRestaurantForOwner, listManagedRestaurants } from "@/lib/restaurants/service";
import { createRestaurantSchema, parseRestaurantBody } from "@/lib/restaurants/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const { user } = await requireRestaurantManagerUser(request);
    const restaurants = await listManagedRestaurants(user.id);
    return Response.json({ ok: true, restaurants });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { user } = await requireRestaurantManagerUser(request);
    const body = await parseRestaurantBody(request, createRestaurantSchema);
    const restaurant = await createRestaurantForOwner(user.id, body);
    return Response.json({ ok: true, restaurant }, { status: 201 });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

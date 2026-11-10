import { getRealRestaurantAnalytics } from "@/lib/analytics/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    if (!restaurantId) {
      return Response.json({ ok: false, error: "Restaurant ID required" }, { status: 400 });
    }

    const data = await getRealRestaurantAnalytics(restaurantId);

    return Response.json({ ok: true, data });
  } catch (err: any) {
    console.error("Error in /api/restaurants/[restaurantId]/analytics:", err);
    return Response.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

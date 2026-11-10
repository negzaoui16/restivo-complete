/**
 * GET /api/discover/restaurants/:id/reviews?page=1&pageSize=10
 * Published reviews of a published restaurant, newest first, with the average and the count.
 * Public: no sign-in needed; reviewers appear as "Sarah B.".
 */
import { RestaurantError, toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { listReviews } from "@/lib/reviews/service";
import { parseReviewListQuery } from "@/lib/reviews/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    let query: { page: number; pageSize: number };
    try {
      query = parseReviewListQuery(request.url);
    } catch (err) {
      throw new RestaurantError("VALIDATION_ERROR", err instanceof Error ? err.message : "Invalid page.");
    }
    return Response.json({ ok: true, ...(await listReviews(restaurantId, query.page, query.pageSize)) });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

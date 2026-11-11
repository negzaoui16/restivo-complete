import { requireManagedRestaurant } from "@/lib/restaurants/access";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { generateFloorPlanFromImages } from "@/lib/ai/floor-plan/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { restaurantId } = await context.params;
    await requireManagedRestaurant(request, restaurantId);

    const body = await request.json().catch(() => ({}));
    const { frontImage, backImage, floorWidth, floorHeight, notes, generateChairs } = body;

    if (!frontImage || !backImage) {
      return Response.json(
        {
          ok: false,
          error: "Both front and back perspective photos are required to reconstruct the 2D floor plan.",
        },
        { status: 400 },
      );
    }

    const width = Number(floorWidth) > 0 ? Number(floorWidth) : 16;
    const height = Number(floorHeight) > 0 ? Number(floorHeight) : 10;

    const result = await generateFloorPlanFromImages({
      frontImage,
      backImage,
      floorWidth: width,
      floorHeight: height,
      notes: typeof notes === "string" ? notes.trim() : undefined,
      generateChairs: generateChairs !== false,
    });

    return Response.json({
      ok: true,
      summary: result.summary,
      objects: result.objects,
    });
  } catch (err: unknown) {
    console.error("[AiGenerateFloorRoute] Error:", err);
    return toRestaurantErrorResponse(err);
  }
}

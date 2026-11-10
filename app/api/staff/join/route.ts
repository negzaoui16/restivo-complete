import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { requireStaffUser } from "@/lib/staff/access";
import { createJoinRequest, loadJoinBoard } from "@/lib/staff/service";
import { parseJoinBody } from "@/lib/staff/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireStaffUser(request);
    const board = await loadJoinBoard(user.id);
    return Response.json({ ok: true, board });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireStaffUser(request);
    const body = await parseJoinBody(request);
    const joinRequest = await createJoinRequest(user.id, body);
    return Response.json({ ok: true, request: joinRequest }, { status: 201 });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}

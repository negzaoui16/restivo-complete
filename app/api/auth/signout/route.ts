import { NextResponse } from "next/server";
import { applyClearedRefreshCookies } from "@/lib/auth/cookies";
import { toErrorResponse } from "@/lib/auth/errors";

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  try {
    return applyClearedRefreshCookies(NextResponse.json({ ok: true }));
  } catch (err) {
    return toErrorResponse(err);
  }
}

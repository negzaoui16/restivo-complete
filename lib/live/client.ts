import { ApiError } from "@/lib/auth/client";
import type { LiveState } from "./types";

export async function apiLiveState(token: string, restaurantId: string): Promise<LiveState> {
  const res = await fetch(`/api/restaurants/${restaurantId}/live`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (json as { code?: string }).code ?? "UNKNOWN_ERROR",
      (json as { message?: string }).message ?? "An unexpected error occurred.",
      res.status,
    );
  }
  return (json as { live: LiveState }).live;
}

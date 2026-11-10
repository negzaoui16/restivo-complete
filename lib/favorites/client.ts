import { ApiError } from "@/lib/auth/client";
import type { DiscoverRestaurantSummary } from "@/lib/discover/types";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (json as { code?: string }).code ?? "UNKNOWN_ERROR",
      (json as { message?: string }).message ?? "An unexpected error occurred.",
      res.status,
    );
  }
  return json as T;
}

const bearer = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export async function apiListFavorites(accessToken: string, signal?: AbortSignal): Promise<DiscoverRestaurantSummary[]> {
  const res = await fetch("/api/favorites", { headers: bearer(accessToken), credentials: "include", cache: "no-store", signal });
  return (await handleResponse<{ restaurants: DiscoverRestaurantSummary[] }>(res)).restaurants;
}

export async function apiAddFavorite(accessToken: string, restaurantId: string): Promise<void> {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { ...bearer(accessToken), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ restaurantId }),
  });
  await handleResponse<{ ok: true }>(res);
}

export async function apiRemoveFavorite(accessToken: string, restaurantId: string): Promise<void> {
  const res = await fetch(`/api/favorites/${encodeURIComponent(restaurantId)}`, {
    method: "DELETE",
    headers: bearer(accessToken),
    credentials: "include",
  });
  await handleResponse<{ ok: true }>(res);
}

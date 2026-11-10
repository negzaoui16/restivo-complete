import { ApiError } from "@/lib/auth/client";
import type { DiscoverList, DiscoverRestaurantDetail } from "./types";

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

function authHeaders(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` }, credentials: "include" as const };
}

export async function apiListDiscoverRestaurants(
  accessToken: string,
  query: string,
  filters: { cuisine?: string; price?: number[] } = {},
  signal?: AbortSignal,
): Promise<DiscoverList> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (filters.cuisine?.trim()) params.set("cuisine", filters.cuisine.trim());
  if (filters.price && filters.price.length > 0) params.set("price", filters.price.join(","));
  const search = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/discover/restaurants${search}`, { ...authHeaders(accessToken), signal });
  const json = await handleResponse<{ restaurants: DiscoverList["restaurants"]; cuisines: string[] }>(res);
  return { restaurants: json.restaurants, cuisines: json.cuisines ?? [] };
}

export async function apiGetDiscoverRestaurant(
  accessToken: string,
  restaurantId: string,
): Promise<DiscoverRestaurantDetail> {
  const res = await fetch(`/api/discover/restaurants/${encodeURIComponent(restaurantId)}`, authHeaders(accessToken));
  const json = await handleResponse<{ restaurant: DiscoverRestaurantDetail }>(res);
  return json.restaurant;
}

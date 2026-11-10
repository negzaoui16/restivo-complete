import { ApiError } from "@/lib/auth/client";
import type { CreateRestaurantBody, UpdateHoursBody } from "./validation";
import type { PublicHoursDay } from "./service";
import type { PublicRestaurant } from "./serialize";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (json as { code?: string }).code ?? "UNKNOWN_ERROR",
      (json as { message?: string }).message ?? "An unexpected error occurred.",
      res.status,
      (json as { field?: string }).field
    );
  }
  return json as T;
}

export async function apiListRestaurants(
  accessToken: string
): Promise<PublicRestaurant[]> {
  const res = await fetch("/api/restaurants", {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  const json = await handleResponse<{ restaurants: PublicRestaurant[] }>(res);
  return json.restaurants;
}

export async function apiSetRestaurantStatus(
  accessToken: string,
  restaurantId: string,
  status: "ACTIVE" | "DRAFT"
): Promise<{ id: string; status: "ACTIVE" | "DRAFT" }> {
  const res = await fetch(`/api/restaurants/${restaurantId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  const json = await handleResponse<{ restaurant: { id: string; status: "ACTIVE" | "DRAFT" } }>(res);
  return json.restaurant;
}

export async function apiCreateRestaurant(
  accessToken: string,
  input: CreateRestaurantBody
): Promise<PublicRestaurant> {
  const res = await fetch("/api/restaurants", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const json = await handleResponse<{ restaurant: PublicRestaurant }>(res);
  return json.restaurant;
}

/** Fields of the profile form; an empty string clears an optional field. */
export type RestaurantProfileInput = Partial<
  Record<
    "name" | "description" | "address" | "city" | "country" | "postalCode" | "website" | "phone" | "email" | "cuisine" | "logoUrl" | "coverUrl",
    string
  >
> & { priceLevel?: number | null };

export async function apiUpdateRestaurant(
  accessToken: string,
  restaurantId: string,
  input: RestaurantProfileInput
): Promise<PublicRestaurant> {
  const res = await fetch(`/api/restaurants/${restaurantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const json = await handleResponse<{ restaurant: PublicRestaurant }>(res);
  return json.restaurant;
}

export async function apiGetHours(accessToken: string, restaurantId: string): Promise<PublicHoursDay[]> {
  const res = await fetch(`/api/restaurants/${restaurantId}/hours`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
    cache: "no-store",
  });
  const json = await handleResponse<{ hours: PublicHoursDay[] }>(res);
  return json.hours;
}

export async function apiUpdateHours(
  accessToken: string,
  restaurantId: string,
  hours: UpdateHoursBody["hours"]
): Promise<PublicHoursDay[]> {
  const res = await fetch(`/api/restaurants/${restaurantId}/hours`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    credentials: "include",
    body: JSON.stringify({ hours }),
  });
  const json = await handleResponse<{ hours: PublicHoursDay[] }>(res);
  return json.hours;
}

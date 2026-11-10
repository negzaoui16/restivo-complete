import { ApiError } from "@/lib/auth/client";
import type { RestaurantRoster, RosterMember, RosterReview } from "./types";

function headers(accessToken: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (json as { code?: string }).code ?? "UNKNOWN_ERROR",
      (json as { message?: string }).message ?? "An unexpected error occurred.",
      res.status
    );
  }
  return json as T;
}

export async function apiGetRoster(accessToken: string, restaurantId: string): Promise<RestaurantRoster> {
  const res = await fetch(`/api/restaurants/${restaurantId}/staff`, {
    headers: headers(accessToken),
    credentials: "include",
  });
  const json = await handleResponse<{ roster: RestaurantRoster }>(res);
  return json.roster;
}

export async function apiReviewRequest(
  accessToken: string,
  restaurantId: string,
  requestId: string,
  decision: "ACCEPT" | "DECLINE"
): Promise<RosterReview> {
  const res = await fetch(`/api/restaurants/${restaurantId}/staff/requests/${requestId}`, {
    method: "POST",
    headers: headers(accessToken, true),
    credentials: "include",
    body: JSON.stringify({ decision }),
  });
  const json = await handleResponse<{ review: RosterReview }>(res);
  return json.review;
}

export async function apiChangeRole(
  accessToken: string,
  restaurantId: string,
  membershipId: string,
  role: "MANAGER" | "STAFF"
): Promise<RosterMember> {
  const res = await fetch(`/api/restaurants/${restaurantId}/staff/${membershipId}/role`, {
    method: "PATCH",
    headers: headers(accessToken, true),
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  const json = await handleResponse<{ member: RosterMember }>(res);
  return json.member;
}

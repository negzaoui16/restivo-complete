import { ApiError } from "@/lib/auth/client";
import type { PublicReview, ReviewPage } from "./types";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (json as { code?: string }).code ?? "UNKNOWN_ERROR",
      (json as { message?: string }).message ?? "An unexpected error occurred.",
      res.status,
      (json as { field?: string }).field,
    );
  }
  return json as T;
}

export async function apiCreateReview(
  accessToken: string,
  reservationId: string,
  input: { rating: number; comment?: string },
): Promise<PublicReview> {
  const res = await fetch(`/api/reservations/${encodeURIComponent(reservationId)}/review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return (await handleResponse<{ review: PublicReview }>(res)).review;
}

export async function apiListReviews(restaurantId: string, page: number, pageSize = 10): Promise<ReviewPage> {
  const res = await fetch(
    `/api/discover/restaurants/${encodeURIComponent(restaurantId)}/reviews?page=${page}&pageSize=${pageSize}`,
    { cache: "no-store" },
  );
  return handleResponse<ReviewPage>(res);
}

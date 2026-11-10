import { ApiError } from "@/lib/auth/client";
import type { Availability, PublicReservation } from "./types";
import type { PublicOrder } from "@/lib/orders/types";
import type { CheckoutBody, CreateReservationBody } from "./validation";

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

function bearer(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function apiGetAvailability(
  accessToken: string,
  restaurantId: string,
  query: { date: string; time: string; guests?: number; exclude?: string },
  signal?: AbortSignal,
): Promise<Availability> {
  const params = new URLSearchParams({ date: query.date, time: query.time });
  if (query.guests) params.set("guests", String(query.guests));
  if (query.exclude) params.set("exclude", query.exclude);
  const res = await fetch(
    `/api/discover/restaurants/${encodeURIComponent(restaurantId)}/availability?${params}`,
    { headers: bearer(accessToken), credentials: "include", signal },
  );
  return (await handleResponse<{ availability: Availability }>(res)).availability;
}

export async function apiCreateReservation(
  accessToken: string,
  input: CreateReservationBody,
): Promise<PublicReservation> {
  const res = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearer(accessToken) },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return (await handleResponse<{ reservation: PublicReservation }>(res)).reservation;
}

/** Books the table and, when `order` is given, pre-orders in the same server transaction. */
export async function apiCheckout(
  accessToken: string,
  input: CheckoutBody,
): Promise<{ reservation: PublicReservation; order: PublicOrder | null }> {
  const res = await fetch("/api/reservations/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearer(accessToken) },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const json = await handleResponse<{ reservation: PublicReservation; order: PublicOrder | null }>(res);
  return { reservation: json.reservation, order: json.order };
}

export async function apiListMyReservations(accessToken: string): Promise<PublicReservation[]> {
  const res = await fetch("/api/reservations", { headers: bearer(accessToken), credentials: "include" });
  return (await handleResponse<{ reservations: PublicReservation[] }>(res)).reservations;
}

export async function apiCancelReservation(
  accessToken: string,
  reservationId: string,
): Promise<{ reservation: PublicReservation; cancelledOrders: number }> {
  const res = await fetch(`/api/reservations/${encodeURIComponent(reservationId)}/cancel`, {
    method: "POST",
    headers: bearer(accessToken),
    credentials: "include",
  });
  const json = await handleResponse<{ reservation: PublicReservation; cancelledOrders: number }>(res);
  return { reservation: json.reservation, cancelledOrders: json.cancelledOrders };
}

export type ReservationChangeInput = {
  tableId: string;
  date: string;
  time: string;
  guestCount: number;
  notes?: string;
};

export async function apiUpdateReservation(
  accessToken: string,
  reservationId: string,
  input: ReservationChangeInput,
): Promise<PublicReservation> {
  const res = await fetch(`/api/reservations/${encodeURIComponent(reservationId)}`, {
    method: "PATCH",
    headers: { ...bearer(accessToken), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return (await handleResponse<{ reservation: PublicReservation }>(res)).reservation;
}

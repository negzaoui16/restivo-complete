import { ApiError } from "@/lib/auth/client";
import type { StaffOrderList, StaffReservationList } from "./board-types";
import type { StaffOrderTarget, StaffReservationTarget } from "./service-rules";

async function handle<T>(res: Response): Promise<T> {
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

function call<T>(token: string, url: string, method: "GET" | "PATCH", body?: unknown): Promise<T> {
  return fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    credentials: "include",
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  }).then((res) => handle<T>(res));
}

const base = (restaurantId: string) => `/api/staff/restaurants/${restaurantId}`;

export const apiStaffReservations = (token: string, restaurantId: string) =>
  call<{ ok: true } & StaffReservationList>(token, `${base(restaurantId)}/reservations`, "GET");

export const apiStaffOrders = (token: string, restaurantId: string) =>
  call<{ ok: true } & StaffOrderList>(token, `${base(restaurantId)}/orders`, "GET");

export const apiStaffSetReservation = (token: string, restaurantId: string, id: string, status: StaffReservationTarget) =>
  call<{ ok: true }>(token, `${base(restaurantId)}/reservations/${id}/status`, "PATCH", { status });

export const apiStaffSetOrder = (token: string, restaurantId: string, id: string, status: StaffOrderTarget) =>
  call<{ ok: true }>(token, `${base(restaurantId)}/orders/${id}/status`, "PATCH", { status });

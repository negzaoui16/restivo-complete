import { ApiError } from "@/lib/auth/client";
import type {
  ActivityItem,
  ManagerOrder,
  ManagerOrderList,
  ManagerReservationList,
  ManagerStats,
  ReservationChange,
} from "./types";
import type { ManagedOrderStatus } from "@/lib/orders/transitions";
import type { ManagedReservationStatus } from "@/lib/reservations/transitions";

async function handle<T>(res: Response): Promise<T> {
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

function get<T>(token: string, url: string): Promise<T> {
  return fetch(url, { headers: { Authorization: `Bearer ${token}` }, credentials: "include", cache: "no-store" }).then(
    (res) => handle<T>(res),
  );
}

function patch<T>(token: string, url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  }).then((res) => handle<T>(res));
}

function query(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const text = Array.isArray(value) ? value.join(",") : value;
    if (text) search.set(key, text);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function apiManagerReservations(
  token: string,
  restaurantId: string,
  filter: { date?: string; status?: string[] } = {},
): Promise<ManagerReservationList> {
  return get<{ ok: true } & ManagerReservationList>(
    token,
    `/api/restaurants/${restaurantId}/reservations${query(filter)}`,
  );
}

export function apiManagerOrders(
  token: string,
  restaurantId: string,
  filter: { date?: string; status?: string[]; reservationId?: string } = {},
): Promise<ManagerOrderList> {
  return get<{ ok: true } & ManagerOrderList>(token, `/api/restaurants/${restaurantId}/orders${query(filter)}`);
}

export async function apiManagerStats(token: string, restaurantId: string, date?: string): Promise<ManagerStats> {
  const json = await get<{ stats: ManagerStats }>(token, `/api/restaurants/${restaurantId}/stats${query({ date })}`);
  return json.stats;
}

export async function apiManagerActivity(token: string, restaurantId: string): Promise<ActivityItem[]> {
  const json = await get<{ activity: ActivityItem[] }>(token, `/api/restaurants/${restaurantId}/activity`);
  return json.activity;
}

export function apiSetReservationStatus(
  token: string,
  restaurantId: string,
  reservationId: string,
  status: ManagedReservationStatus,
): Promise<ReservationChange> {
  return patch<{ ok: true } & ReservationChange>(
    token,
    `/api/restaurants/${restaurantId}/reservations/${reservationId}/status`,
    { status },
  );
}

export async function apiSetOrderStatus(
  token: string,
  restaurantId: string,
  orderId: string,
  status: ManagedOrderStatus,
): Promise<ManagerOrder> {
  const json = await patch<{ order: ManagerOrder }>(token, `/api/restaurants/${restaurantId}/orders/${orderId}/status`, {
    status,
  });
  return json.order;
}

import { ApiError } from "@/lib/auth/client";
import type { DiscoverMenu, PublicOrder } from "./types";
import type { CreateOrderBody } from "./validation";

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

export async function apiGetMenu(accessToken: string, restaurantId: string): Promise<DiscoverMenu> {
  const res = await fetch(`/api/discover/restaurants/${encodeURIComponent(restaurantId)}/menu`, {
    headers: bearer(accessToken),
    credentials: "include",
  });
  const json = await handleResponse<DiscoverMenu & { ok: true }>(res);
  return { currency: json.currency, decimals: json.decimals, menu: json.menu };
}

export async function apiCreateOrder(accessToken: string, input: CreateOrderBody): Promise<PublicOrder> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearer(accessToken) },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return (await handleResponse<{ order: PublicOrder }>(res)).order;
}

export async function apiListMyOrders(accessToken: string): Promise<PublicOrder[]> {
  const res = await fetch("/api/orders", { headers: bearer(accessToken), credentials: "include" });
  return (await handleResponse<{ orders: PublicOrder[] }>(res)).orders;
}

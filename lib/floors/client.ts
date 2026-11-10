import { ApiError } from "@/lib/auth/client";
import type { FloorObject } from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";
import type { PublicFloor } from "./types";

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

function headers(accessToken: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

function floorUrl(restaurantId: string, floorId?: string, action?: "layout" | "duplicate" | "reorder") {
  const base = `/api/restaurants/${restaurantId}/floors`;
  if (!floorId) return base;
  return action ? `${base}/${floorId}/${action}` : `${base}/${floorId}`;
}

export async function apiListFloors(accessToken: string, restaurantId: string): Promise<PublicFloor[]> {
  const res = await fetch(floorUrl(restaurantId), {
    headers: headers(accessToken),
    credentials: "include",
  });
  const json = await handleResponse<{ floors: PublicFloor[] }>(res);
  return json.floors;
}

export async function apiCreateFloor(
  accessToken: string,
  restaurantId: string,
  input: { name: string; width: number; height: number },
): Promise<PublicFloor> {
  const res = await fetch(floorUrl(restaurantId), {
    method: "POST",
    headers: headers(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });
  const json = await handleResponse<{ floor: PublicFloor }>(res);
  return json.floor;
}

export async function apiUpdateFloor(
  accessToken: string,
  restaurantId: string,
  floorId: string,
  input: { name?: string; width?: number; height?: number },
): Promise<PublicFloor> {
  const res = await fetch(floorUrl(restaurantId, floorId), {
    method: "PATCH",
    headers: headers(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });
  const json = await handleResponse<{ floor: PublicFloor }>(res);
  return json.floor;
}

export async function apiDeleteFloor(accessToken: string, restaurantId: string, floorId: string): Promise<PublicFloor[]> {
  const res = await fetch(floorUrl(restaurantId, floorId), {
    method: "DELETE",
    headers: headers(accessToken),
    credentials: "include",
  });
  const json = await handleResponse<{ floors: PublicFloor[] }>(res);
  return json.floors;
}

export async function apiDuplicateFloor(accessToken: string, restaurantId: string, floorId: string): Promise<PublicFloor> {
  const res = await fetch(floorUrl(restaurantId, floorId, "duplicate"), {
    method: "POST",
    headers: headers(accessToken),
    credentials: "include",
  });
  const json = await handleResponse<{ floor: PublicFloor }>(res);
  return json.floor;
}

export async function apiReorderFloor(accessToken: string, restaurantId: string, floorId: string): Promise<PublicFloor[]> {
  const res = await fetch(floorUrl(restaurantId, floorId, "reorder"), {
    method: "POST",
    headers: headers(accessToken),
    credentials: "include",
  });
  const json = await handleResponse<{ floors: PublicFloor[] }>(res);
  return json.floors;
}

export async function apiSaveLayout(
  accessToken: string,
  restaurantId: string,
  floorId: string,
  objects: FloorObject[],
  publish = false,
): Promise<PublicFloor> {
  const res = await fetch(floorUrl(restaurantId, floorId, "layout"), {
    method: "PUT",
    headers: headers(accessToken, true),
    credentials: "include",
    body: JSON.stringify({ objects, publish }),
  });
  const json = await handleResponse<{ floor: PublicFloor }>(res);
  return json.floor;
}

export async function apiSetFloorActive(
  accessToken: string,
  restaurantId: string,
  floorId: string,
  isActive: boolean,
): Promise<PublicFloor[]> {
  const res = await fetch(`/api/restaurants/${restaurantId}/floors/${floorId}/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    credentials: "include",
    body: JSON.stringify({ isActive }),
  });
  const json = await handleResponse<{ floors: PublicFloor[] }>(res);
  return json.floors;
}

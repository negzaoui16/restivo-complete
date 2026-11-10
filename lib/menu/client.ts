import { ApiError } from "@/lib/auth/client";
import type {
  CreateCategoryInput,
  CreateItemInput,
  CreateMenuInput,
  CreatePromotionInput,
  UpdateCategoryInput,
  UpdateItemInput,
  UpdateMenuInput,
  UpdatePromotionInput,
} from "./validation";
import type { PublicMenu } from "./types";

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

function headers(accessToken: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function mutate(
  accessToken: string,
  url: string,
  method: string,
  body?: unknown
): Promise<PublicMenu> {
  const res = await fetch(url, {
    method,
    headers: headers(accessToken, body !== undefined),
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await handleResponse<{ menu: PublicMenu }>(res);
  return json.menu;
}

export async function apiGetMenu(
  accessToken: string,
  restaurantId: string
): Promise<PublicMenu | null> {
  const res = await fetch(`/api/restaurants/${restaurantId}/menu`, {
    headers: headers(accessToken),
    credentials: "include",
  });
  const json = await handleResponse<{ menu: PublicMenu | null }>(res);
  return json.menu;
}

export async function apiCreateMenu(
  accessToken: string,
  restaurantId: string,
  input: CreateMenuInput = { name: "Main menu" }
): Promise<PublicMenu> {
  return mutate(accessToken, `/api/restaurants/${restaurantId}/menu`, "POST", input);
}

export async function apiUpdateMenu(
  accessToken: string,
  restaurantId: string,
  input: UpdateMenuInput
): Promise<PublicMenu> {
  return mutate(accessToken, `/api/restaurants/${restaurantId}/menu`, "PATCH", input);
}

export async function apiCreateCategory(
  accessToken: string,
  restaurantId: string,
  input: CreateCategoryInput
): Promise<PublicMenu> {
  return mutate(accessToken, `/api/restaurants/${restaurantId}/menu/categories`, "POST", input);
}

export async function apiUpdateCategory(
  accessToken: string,
  restaurantId: string,
  categoryId: string,
  input: UpdateCategoryInput
): Promise<PublicMenu> {
  return mutate(
    accessToken,
    `/api/restaurants/${restaurantId}/menu/categories/${categoryId}`,
    "PATCH",
    input
  );
}

export async function apiDeleteCategory(
  accessToken: string,
  restaurantId: string,
  categoryId: string
): Promise<PublicMenu> {
  return mutate(
    accessToken,
    `/api/restaurants/${restaurantId}/menu/categories/${categoryId}`,
    "DELETE"
  );
}

export async function apiCreateItem(
  accessToken: string,
  restaurantId: string,
  input: CreateItemInput
): Promise<PublicMenu> {
  return mutate(accessToken, `/api/restaurants/${restaurantId}/menu/items`, "POST", input);
}

export async function apiUpdateItem(
  accessToken: string,
  restaurantId: string,
  itemId: string,
  input: UpdateItemInput
): Promise<PublicMenu> {
  return mutate(
    accessToken,
    `/api/restaurants/${restaurantId}/menu/items/${itemId}`,
    "PATCH",
    input
  );
}

export async function apiDeleteItem(
  accessToken: string,
  restaurantId: string,
  itemId: string
): Promise<PublicMenu> {
  return mutate(accessToken, `/api/restaurants/${restaurantId}/menu/items/${itemId}`, "DELETE");
}

export async function apiCreatePromotion(
  accessToken: string,
  restaurantId: string,
  input: CreatePromotionInput
): Promise<PublicMenu> {
  return mutate(accessToken, `/api/restaurants/${restaurantId}/promotions`, "POST", input);
}

export async function apiUpdatePromotion(
  accessToken: string,
  restaurantId: string,
  promotionId: string,
  input: UpdatePromotionInput
): Promise<PublicMenu> {
  return mutate(
    accessToken,
    `/api/restaurants/${restaurantId}/promotions/${promotionId}`,
    "PATCH",
    input
  );
}

export async function apiDeletePromotion(
  accessToken: string,
  restaurantId: string,
  promotionId: string
): Promise<PublicMenu> {
  return mutate(
    accessToken,
    `/api/restaurants/${restaurantId}/promotions/${promotionId}`,
    "DELETE"
  );
}

export async function apiMoveCategory(
  accessToken: string,
  restaurantId: string,
  categoryId: string,
  direction: "up" | "down"
): Promise<PublicMenu> {
  return mutate(accessToken, `/api/restaurants/${restaurantId}/menu/categories/${categoryId}/move`, "POST", {
    direction,
  });
}

export async function apiMoveItem(
  accessToken: string,
  restaurantId: string,
  itemId: string,
  direction: "up" | "down"
): Promise<PublicMenu> {
  return mutate(accessToken, `/api/restaurants/${restaurantId}/menu/items/${itemId}/move`, "POST", {
    direction,
  });
}

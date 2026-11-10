import { ApiError } from "@/lib/auth/client";
import type { NotificationList } from "./service";

export type { NotificationList, PublicNotification } from "./service";

async function handle(res: Response): Promise<NotificationList> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (json as { code?: string }).code ?? "UNKNOWN_ERROR",
      (json as { message?: string }).message ?? "An unexpected error occurred.",
      res.status,
    );
  }
  return json as NotificationList;
}

export function apiListNotifications(token: string): Promise<NotificationList> {
  return fetch("/api/notifications", {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
    cache: "no-store",
  }).then(handle);
}

/** `ids` marks those notifications; "all" marks every unread one. */
export function apiMarkNotificationsRead(token: string, ids: string[] | "all"): Promise<NotificationList> {
  return fetch("/api/notifications/read", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(ids === "all" ? { all: true } : { ids }),
  }).then(handle);
}

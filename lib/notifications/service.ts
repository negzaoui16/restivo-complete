/**
 * In-app notifications for customers. Written inside the transaction that
 * changes a reservation or an order, so a notification exists if and only if
 * the change happened.
 */
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type NotificationData = {
  reservationId?: string;
  orderId?: string;
  status?: string;
  restaurantId?: string;
  role?: string;
  /** Live floor alerts: the stable key that stops the same alert being written twice. */
  alertKey?: string;
  alertKind?: string;
  tableId?: string;
};

export type NotificationKind = "RESERVATION" | "ORDER" | "STAFF_REQUEST" | "SYSTEM";

export type NewNotification = {
  userId: string;
  restaurantId: string;
  type: NotificationKind;
  title: string;
  message: string;
  data: NotificationData;
};

export type PublicNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: NotificationData | null;
  createdAt: string;
  readAt: string | null;
};

export type NotificationList = { notifications: PublicNotification[]; unread: number };

/** Notifications disappear from the list after this many days. */
export const NOTIFICATION_TTL_DAYS = 30;
const LIST_LIMIT = 30;

export async function createNotificationIn(tx: Tx, input: NewNotification): Promise<void> {
  await tx.orm.public.Notification.create({
    userId: input.userId,
    restaurantId: input.restaurantId,
    type: input.type,
    title: input.title,
    message: input.message,
    data: JSON.parse(JSON.stringify(input.data)),
    expiresAt: Temporal.Now.instant().add({ hours: NOTIFICATION_TTL_DAYS * 24 }),
  });
}

function toMs(value: unknown): number {
  return value ? Temporal.Instant.from(String(value)).epochMilliseconds : Number.NaN;
}

async function liveRows(userId: string) {
  const nowMs = Date.now();
  const rows = await db.orm.public.Notification.where({ userId }).all();
  return rows.filter((row) => !row.expiresAt || toMs(row.expiresAt) > nowMs);
}

export async function listNotifications(userId: string): Promise<NotificationList> {
  const rows = await liveRows(userId);
  const sorted = [...rows].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  return {
    unread: rows.filter((row) => !row.readAt).length,
    notifications: sorted.slice(0, LIST_LIMIT).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: (row.data as PublicNotification["data"]) ?? null,
      createdAt: Temporal.Instant.from(String(row.createdAt)).toString(),
      readAt: row.readAt ? Temporal.Instant.from(String(row.readAt)).toString() : null,
    })),
  };
}

/** Marks the given notifications (or all of them) as read. Only the owner's rows are touched. */
export async function markNotificationsRead(userId: string, ids: string[] | "all"): Promise<NotificationList> {
  const rows = await liveRows(userId);
  const wanted = ids === "all" ? null : new Set(ids);
  const now = Temporal.Now.instant();
  for (const row of rows) {
    if (row.readAt || (wanted && !wanted.has(row.id))) continue;
    await db.orm.public.Notification.where({ id: row.id }).update({ readAt: now });
  }
  return listNotifications(userId);
}

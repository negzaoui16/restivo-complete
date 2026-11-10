import type { StaffOrder } from "@/lib/staff/board-types";
import type { StaffOrderTarget } from "@/lib/staff/service-rules";

/** The kitchen steps, left to right. "New" is an order a manager has confirmed. */
export const ORDER_COLUMNS: { status: StaffOrder["status"]; label: string }[] = [
  { status: "CONFIRMED", label: "New" },
  { status: "PREPARING", label: "Preparing" },
  { status: "READY", label: "Ready" },
  { status: "DELIVERED", label: "Served" },
];

export const ORDER_ACTION_LABEL: Record<StaffOrderTarget, string> = {
  PREPARING: "Start preparing",
  READY: "Mark ready",
  DELIVERED: "Mark served",
};

export function itemLabel(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

export function matchesQuery(text: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle.length === 0 || text.toLowerCase().includes(needle);
}

/** A short ticket number: the last four characters of the order id. */
export function ticketNumber(orderId: string): string {
  return orderId.slice(-4).toUpperCase();
}

export function minutesSince(iso: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - Date.parse(iso)) / 60_000));
}

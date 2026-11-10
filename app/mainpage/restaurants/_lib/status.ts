import type { ManagedOrderStatus } from "@/lib/orders/transitions";
import type { ManagedReservationStatus } from "@/lib/reservations/transitions";

export const RESERVATION_LABEL: Record<ManagedReservationStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SEATED: "Seated",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

export const ORDER_LABEL: Record<ManagedOrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/** Badge colours, shared by reservations and orders. */
export const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-[#FFF4DC] text-[#8A5A00] border-[#F3DDA6]",
  CONFIRMED: "bg-[#E7F5EA] text-[#227B3A] border-[#C6E6CD]",
  SEATED: "bg-[#E6EEF9] text-[#24508F] border-[#C5D7F0]",
  PREPARING: "bg-[#FDF0E6] text-[#D96B27] border-[#FADCC7]",
  READY: "bg-[#E7F5EA] text-[#227B3A] border-[#C6E6CD]",
  DELIVERED: "bg-[#F1EEE8] text-[#6B6661] border-[#E1DBCF]",
  COMPLETED: "bg-[#F1EEE8] text-[#6B6661] border-[#E1DBCF]",
  CANCELLED: "bg-[#FBEAE5] text-[#B55234] border-[#F0CFC4]",
  NO_SHOW: "bg-[#F1EEE8] text-[#6B6661] border-[#E1DBCF]",
};

export const RESERVATION_ACTION_LABEL: Partial<Record<ManagedReservationStatus, string>> = {
  CONFIRMED: "Confirm",
  SEATED: "Seat",
  COMPLETED: "Complete",
  NO_SHOW: "No-show",
  CANCELLED: "Cancel",
};

export const ORDER_ACTION_LABEL: Partial<Record<ManagedOrderStatus, string>> = {
  CONFIRMED: "Confirm",
  PREPARING: "Prepare",
  READY: "Ready",
  DELIVERED: "Deliver",
  CANCELLED: "Cancel",
};

/** Moves that need a confirmation in the page because they cannot be undone. */
export const NEEDS_CONFIRMATION = ["CANCELLED", "NO_SHOW"];

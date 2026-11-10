import { db } from "@/lib/db";

/**
 * True when someone other than the customer cancelled it, found in the AuditLog
 * (manager status changes write `{ from, to }`; customer cancellations are by the customer).
 */
export async function cancelledByRestaurant(
  entityType: "Reservation" | "Order",
  entityId: string,
  customerId: string,
): Promise<boolean> {
  const logs = await db.orm.public.AuditLog.where({ entityType, entityId }).all();
  return logs.some((log) => {
    const metadata = log.metadata as { to?: string } | null;
    return metadata?.to === "CANCELLED" && log.userId !== null && log.userId !== customerId;
  });
}

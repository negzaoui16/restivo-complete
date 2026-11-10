/**
 * Turns the due live alerts into notifications for the managers of the restaurant.
 *
 * There is no scheduled job: the alerts are created when the live state is read, and several
 * browsers can read it at the same moment. So the check-and-insert runs in one transaction under
 * an advisory lock per restaurant. The second reader waits, then sees the keys the first one
 * stored (`data.alertKey`) and creates nothing.
 */
import { db } from "@/lib/db";
import { advisoryXactLock } from "@/lib/locks";
import { createNotificationIn } from "@/lib/notifications/service";
import { dueAlerts, type AlertReservation, type AlertTable } from "./alerts";
import type { LiveReservation, LiveTable } from "./types";

function asAlertReservation(reservation: LiveReservation | null): AlertReservation | null {
  if (!reservation) return null;
  return {
    id: reservation.id,
    status: reservation.status,
    startsAtMs: Date.parse(reservation.startsAt),
    endsAtMs: Date.parse(reservation.endsAt),
    customerName: reservation.customerName,
    guestCount: reservation.guestCount,
  };
}

/** Owner and active managers: the people who run the live floor. */
async function recipientsOf(restaurantId: string): Promise<string[]> {
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  if (!restaurant) return [];
  const memberships = await db.orm.public.RestaurantMembership.where({ restaurantId, status: "ACTIVE" }).all();
  const ids = new Set<string>([restaurant.ownerId]);
  for (const membership of memberships) {
    if (membership.role === "OWNER" || membership.role === "MANAGER") ids.add(membership.userId);
  }
  return [...ids];
}

/** Creates the alerts that are due and not stored yet; returns how many notifications it wrote. */
export async function syncLiveAlerts(restaurantId: string, nowMs: number, tables: readonly LiveTable[]): Promise<number> {
  const alertTables: AlertTable[] = tables.map((table) => ({
    id: table.id,
    name: table.name,
    state: table.state,
    current: asAlertReservation(table.current),
    next: asAlertReservation(table.next),
  }));
  const due = dueAlerts(nowMs, alertTables);
  if (due.length === 0) return 0;

  const recipients = await recipientsOf(restaurantId);
  if (recipients.length === 0) return 0;

  return db.transaction(async (tx) => {
    await advisoryXactLock(tx, `live-alerts:${restaurantId}`);

    const stored = await tx.orm.public.Notification.where({ restaurantId, type: "SYSTEM" }).all();
    const seen = new Set<string>();
    for (const row of stored) {
      const key = (row.data as { alertKey?: string } | null)?.alertKey;
      if (key) seen.add(`${row.userId}|${key}`);
    }

    let written = 0;
    for (const alert of due) {
      for (const userId of recipients) {
        if (seen.has(`${userId}|${alert.key}`)) continue;
        await createNotificationIn(tx, {
          userId,
          restaurantId,
          type: "SYSTEM",
          title: alert.title,
          message: alert.message,
          data: { alertKey: alert.key, alertKind: alert.kind, reservationId: alert.reservationId, tableId: alert.tableId },
        });
        written += 1;
      }
    }
    return written;
  });
}

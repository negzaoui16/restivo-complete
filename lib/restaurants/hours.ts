/**
 * Opening-hours rules shared by the form, the API validation and the display.
 *
 * A day is "HH:MM" to "HH:MM". When the closing time is before the opening
 * time the restaurant closes the next day (12:00 to 03:00). Equal times are
 * refused: there is no 24-hour mode. No imports, so node:test runs it.
 */

export type HoursInput = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** True when closing is on the day after opening (close earlier than open). */
export function closesNextDay(openTime: string | null, closeTime: string | null): boolean {
  if (!openTime || !closeTime || !TIME.test(openTime) || !TIME.test(closeTime)) return false;
  return closeTime < openTime;
}

/** The message for a bad open day, with the field to blame, or null when the day is fine. */
export function hoursProblem(day: HoursInput): { field: "openTime" | "closeTime"; message: string } | null {
  if (day.isClosed) return null;
  if (!day.openTime || !TIME.test(day.openTime)) {
    return { field: "openTime", message: "Enter an opening time such as 11:00." };
  }
  if (!day.closeTime || !TIME.test(day.closeTime)) {
    return { field: "closeTime", message: "Enter a closing time such as 23:00." };
  }
  if (day.openTime === day.closeTime) {
    return { field: "closeTime", message: "Closing time must differ from opening time (24-hour opening is not supported)." };
  }
  return null;
}

/** "11:00 - 23:00", "12:00 - 03:00 (next day)" or "Closed". */
export function describeHours(day: Pick<HoursInput, "isClosed" | "openTime" | "closeTime"> | undefined): string {
  if (!day || day.isClosed || !day.openTime || !day.closeTime) return "Closed";
  const range = `${day.openTime.slice(0, 5)} - ${day.closeTime.slice(0, 5)}`;
  return closesNextDay(day.openTime.slice(0, 5), day.closeTime.slice(0, 5)) ? `${range} (next day)` : range;
}

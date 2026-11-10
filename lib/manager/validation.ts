import { z } from "zod";
import { ReservationError } from "@/lib/reservations/errors";

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.");

const RESERVATION_STATUSES = ["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"] as const;

/** "CONFIRMED,SEATED" -> ["CONFIRMED", "SEATED"]; empty means no filter. */
const statusList = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((text) => text.split(",").map((part) => part.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values), { error: "Unknown status." }));

export const reservationListSchema = z
  .object({
    date: dateField.optional(),
    from: dateField.optional(),
    to: dateField.optional(),
    status: statusList(RESERVATION_STATUSES).optional(),
  })
  .refine((q) => !q.date || (!q.from && !q.to), { message: "Use either date or from/to." })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "The end date is before the start date." });

export const orderListSchema = z.object({
  status: statusList(ORDER_STATUSES).optional(),
  reservationId: z.string().min(1).optional(),
  /** A local day, or "today" in the time zone of the restaurant. */
  date: dateField.or(z.literal("today")).optional(),
});

export const statsQuerySchema = z.object({ date: dateField.optional() });

export const reservationStatusSchema = z.object({
  status: z.enum(RESERVATION_STATUSES, { error: "Choose a valid status." }),
});

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { error: "Choose a valid status." }),
});

/** Query string -> typed object; blank values are dropped. */
export function parseManagerQuery<T>(request: Request, schema: z.ZodType<T>): T {
  const raw: Record<string, string> = {};
  for (const [key, value] of new URL(request.url).searchParams) {
    if (value.trim() !== "") raw[key] = value.trim();
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ReservationError("VALIDATION_ERROR", result.error.issues[0]?.message ?? "Invalid filter.");
  }
  return result.data;
}

export async function parseManagerBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ReservationError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ReservationError("VALIDATION_ERROR", result.error.issues[0]?.message ?? "Invalid request data.");
  }
  return result.data;
}

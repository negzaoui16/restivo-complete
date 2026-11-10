import { z } from "zod";
import { MAX_GUESTS } from "./constants";
import { orderLinesSchema } from "@/lib/orders/validation";
import { ReservationError } from "./errors";

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.");
const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time.");
const guestsField = z
  .number({ error: "Enter the number of guests." })
  .int("Enter the number of guests.")
  .min(1, "At least one guest is required.")
  .max(MAX_GUESTS, `A reservation can hold at most ${MAX_GUESTS} guests.`);

export const createReservationSchema = z.object({
  restaurantId: z.string().min(1, "Choose a restaurant."),
  tableId: z.string().min(1, "Choose a table."),
  date: dateField,
  time: timeField,
  guestCount: guestsField,
  notes: z.string().trim().max(500, "Keep notes under 500 characters.").optional(),
});

export type CreateReservationBody = z.infer<typeof createReservationSchema>;

/**
 * A change to an existing reservation: the same fields and rules as a booking.
 * Notes left out stay as they are; an empty string clears them.
 */
export const updateReservationSchema = z.object({
  tableId: z.string().min(1, "Choose a table."),
  date: dateField,
  time: timeField,
  guestCount: guestsField,
  notes: z.string().trim().max(500, "Keep notes under 500 characters.").optional(),
});

export type UpdateReservationBody = z.infer<typeof updateReservationSchema>;

/**
 * Reservation and optional pre-order in one request. As for a plain order, only
 * dish ids and quantities are read: any price the client sends is dropped.
 */
export const checkoutSchema = z.object({
  reservation: createReservationSchema,
  order: orderLinesSchema.optional(),
});

export type CheckoutBody = z.infer<typeof checkoutSchema>;

export const availabilityQuerySchema = z.object({
  date: dateField,
  time: timeField,
  guests: z.coerce.number().int().min(1).max(MAX_GUESTS).optional(),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

function fail(message: string | undefined): never {
  throw new ReservationError("VALIDATION_ERROR", message);
}

export async function parseReservationBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    fail("Request body must be valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) fail(result.error.issues[0]?.message ?? "Invalid request data.");
  return result.data;
}

export function parseAvailabilityQuery(url: string): AvailabilityQuery {
  const params = new URL(url).searchParams;
  const result = availabilityQuerySchema.safeParse({
    date: params.get("date") ?? "",
    time: params.get("time") ?? "",
    guests: params.get("guests") ?? undefined,
  });
  if (!result.success) fail(result.error.issues[0]?.message ?? "Invalid request data.");
  return result.data;
}

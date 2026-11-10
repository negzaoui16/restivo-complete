import { z } from "zod";
import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from "./constants";
import { OrderError } from "./errors";

/**
 * Only dish ids and quantities are read. Any price, total or discount a client
 * sends is dropped by the parser: the server always prices from the menu.
 */
const itemsField = z
  .array(
    z.object({
      menuItemId: z.string().min(1, "Choose a dish."),
      quantity: z
        .number({ error: "Enter a quantity." })
        .int("Enter a whole quantity.")
        .min(1, "Quantity must be at least 1.")
        .max(MAX_LINE_QUANTITY, `You can order at most ${MAX_LINE_QUANTITY} of one dish.`),
      notes: z.string().trim().max(200, "Keep dish notes under 200 characters.").optional(),
    }),
  )
  .min(1, "Add at least one dish.")
  .max(MAX_ORDER_LINES, `An order can have at most ${MAX_ORDER_LINES} dishes.`);

/** The part of an order a client may send: notes and dish lines, never a price. */
export const orderLinesSchema = z.object({
  notes: z.string().trim().max(500, "Keep notes under 500 characters.").optional(),
  items: itemsField,
});

export const createOrderSchema = z.object({
  reservationId: z.string().min(1, "Choose a reservation."),
  notes: z.string().trim().max(500, "Keep notes under 500 characters.").optional(),
  items: itemsField,
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;

function fail(message: string | undefined): never {
  throw new OrderError("VALIDATION_ERROR", message);
}

export async function parseOrderBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
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

export function parseReservationFilter(url: string): string | undefined {
  const value = new URL(url).searchParams.get("reservationId");
  return value && value.length <= 100 ? value : undefined;
}

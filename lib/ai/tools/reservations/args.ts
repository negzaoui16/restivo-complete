import { z } from "zod";

/** Same cap as the other list tools (../args.ts); no import so node:test can load this file. */
const LIST_LIMIT = 40;

const STATUSES = ["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

/**
 * get_reservations: one local day (today by default) and an optional status filter.
 * The restaurant never appears here; it comes from the signed-in manager.
 */
export const reservationArgs = {
  parameters: {
    type: "object",
    properties: {
      date: { type: "string", description: "A local day, YYYY-MM-DD. Today when left out." },
      status: { type: "string", enum: [...STATUSES], description: "Only reservations with this status." },
      limit: { type: "integer", minimum: 1, maximum: LIST_LIMIT, description: `Rows to return. Anything above ${LIST_LIMIT} is reduced to ${LIST_LIMIT}.` },
    },
    additionalProperties: false,
  } as const,
  schema: z
    .object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-03.")
        .optional(),
      status: z.enum(STATUSES).optional(),
      limit: z
        .number()
        .int()
        .min(1)
        .optional()
        .transform((value) => Math.min(value ?? LIST_LIMIT, LIST_LIMIT)),
    })
    .strict(),
};

export type ReservationArgs = z.infer<typeof reservationArgs.schema>;

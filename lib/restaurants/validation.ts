import { z } from "zod";
import { RestaurantError } from "@/lib/restaurants/errors";
import { DAY_NAMES, hoursProblem } from "@/lib/restaurants/hours";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function toHhMm(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

function blankToUndefined(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

const hoursDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    openTime: z
      .union([z.string(), z.null()])
      .optional()
      .transform((value) => toHhMm(value ?? null))
      .refine((value) => value === null || TIME_RE.test(value), "Use 24-hour time, e.g. 11:00."),
    closeTime: z
      .union([z.string(), z.null()])
      .optional()
      .transform((value) => toHhMm(value ?? null))
      .refine((value) => value === null || TIME_RE.test(value), "Use 24-hour time, e.g. 23:00."),
  })
  .superRefine((day, ctx) => {
    const problem = hoursProblem(day);
    if (problem) {
      ctx.addIssue({ code: "custom", path: [problem.field], message: `${DAY_NAMES[day.dayOfWeek]}: ${problem.message}` });
    }
  });

/** Seven days, each weekday exactly once. */
export const hoursSchema = z
  .array(hoursDaySchema)
  .length(7, "Provide hours for all 7 days.")
  .refine((days) => new Set(days.map((day) => day.dayOfWeek)).size === 7, "Each day of the week must appear once.");

export const updateHoursSchema = z.object({ hours: hoursSchema });
export type UpdateHoursBody = z.infer<typeof updateHoursSchema>;

/** An http(s) link; used for the logo and the cover photo. */
const imageUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(400, `Keep the ${label} link under 400 characters.`)
    .refine((value) => value === "" || /^(https?:\/\/\S+|\/[\w\-./]+)$/i.test(value), `The ${label} link must start with http:// or https://.`);

const priceLevel = z
  .number({ error: "Choose a price level from 1 to 4." })
  .int("Choose a price level from 1 to 4.")
  .min(1, "Choose a price level from 1 to 4.")
  .max(4, "Choose a price level from 1 to 4.");

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(2, "Restaurant name is required.").max(80),
  description: blankToUndefined(600),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^\+?[\d\s\-().]{7,20}$/.test(value),
      "Please enter a valid phone number."
    )
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Please enter a valid email address."
    )
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  website: blankToUndefined(200),
  cuisine: blankToUndefined(60),
  priceLevel: priceLevel.optional(),
  logoUrl: imageUrl("logo").optional().transform((value) => (value ? value : undefined)),
  coverUrl: imageUrl("cover").optional().transform((value) => (value ? value : undefined)),
  address: blankToUndefined(160),
  city: blankToUndefined(80),
  country: blankToUndefined(80),
  postalCode: blankToUndefined(20),
  currency: z.string().trim().min(3).max(3).toUpperCase().default("TND"),
  timezone: z.string().trim().min(3).max(60).default("Africa/Tunis"),
  hours: hoursSchema,
  floor: z.object({
    name: z.string().trim().min(1, "Floor name is required.").max(60),
    width: z.number().min(400).max(4000),
    height: z.number().min(400).max(4000),
  }),
});

export type CreateRestaurantBody = z.infer<typeof createRestaurantSchema>;

/** Text that may be cleared: an empty string becomes null, an absent key stays unchanged. */
function clearableText(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value === undefined ? undefined : value.length > 0 ? value : null));
}

/**
 * Profile edits. The slug never changes (links stay stable) and the currency and
 * time zone are fixed after creation: prices and booked slots depend on them.
 */
export const updateRestaurantSchema = z.object({
  name: z.string().trim().min(2, "Restaurant name is required.").max(80, "Keep the name under 80 characters.").optional(),
  description: clearableText(600, "Keep the description under 600 characters."),
  address: clearableText(160, "Keep the address under 160 characters."),
  city: clearableText(80, "Keep the city under 80 characters."),
  country: clearableText(80, "Keep the country under 80 characters."),
  postalCode: clearableText(20, "Keep the postal code under 20 characters."),
  cuisine: clearableText(60, "Keep the cuisine under 60 characters."),
  priceLevel: priceLevel.nullable().optional(),
  logoUrl: imageUrl("logo").optional().transform((value) => (value === undefined ? undefined : value === "" ? null : value)),
  coverUrl: imageUrl("cover").optional().transform((value) => (value === undefined ? undefined : value === "" ? null : value)),
  website: clearableText(200, "Keep the website under 200 characters."),
  phone: clearableText(20, "Please enter a valid phone number.").refine(
    (value) => !value || /^\+?[\d\s\-().]{7,20}$/.test(value),
    "Please enter a valid phone number."
  ),
  email: clearableText(120, "Please enter a valid email address.")
    .transform((value) => (value ? value.toLowerCase() : value))
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Please enter a valid email address."),
});

export type UpdateRestaurantBody = z.infer<typeof updateRestaurantSchema>;

export const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "DRAFT"], { error: "Choose ACTIVE or DRAFT." }),
});

export type UpdateStatusBody = z.infer<typeof updateStatusSchema>;

export async function parseRestaurantBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    throw new RestaurantError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new RestaurantError(
      "VALIDATION_ERROR",
      firstIssue?.message ?? "Invalid request data.",
      typeof firstIssue?.path[0] === "string" ? firstIssue.path[0] : undefined
    );
  }

  return result.data;
}

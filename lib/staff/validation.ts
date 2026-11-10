import { z } from "zod";
import { RestaurantError } from "@/lib/restaurants/errors";

export const joinRequestSchema = z.object({
  restaurantId: z.string().trim().min(1).max(40),
  message: z
    .string()
    .trim()
    .max(280, "Keep the note under 280 characters.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type JoinRequestBody = z.infer<typeof joinRequestSchema>;

export const reviewRequestSchema = z.object({
  decision: z.enum(["ACCEPT", "DECLINE"]),
});

export type ReviewRequestBody = z.infer<typeof reviewRequestSchema>;

export async function parseJoinBody(request: Request): Promise<JoinRequestBody> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new RestaurantError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const result = joinRequestSchema.safeParse(raw);
  if (!result.success) {
    throw new RestaurantError(
      "VALIDATION_ERROR",
      result.error.issues[0]?.message ?? "Invalid request data."
    );
  }

  return result.data;
}

export async function parseReviewBody(request: Request): Promise<ReviewRequestBody> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new RestaurantError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const result = reviewRequestSchema.safeParse(raw);
  if (!result.success) {
    throw new RestaurantError(
      "VALIDATION_ERROR",
      result.error.issues[0]?.message ?? "Choose accept or decline."
    );
  }

  return result.data;
}

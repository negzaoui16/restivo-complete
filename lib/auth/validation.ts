/**
 * Zod validation schemas for every auth endpoint.
 *
 * Centralised here so route handlers stay thin and validation rules are
 * easy to find, test, and evolve independently.
 *
 * Note: Targets Zod v4 whose API changed `required_error`/`invalid_type_error`
 * to a single `error` string.
 */
import { z } from "zod";
import { AuthError } from "./errors";

// ─── Shared field definitions ─────────────────────────────────────────────────

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.");

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must not exceed 72 characters.");

// ─── Sign-up ─────────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  email: emailField,
  password: passwordField,
  firstName: z.string().min(1, "First name is required.").max(80).trim(),
  lastName: z.string().min(1, "Last name is required.").max(80).trim(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-().]{7,20}$/, "Please enter a valid phone number.")
    .optional(),
  role: z.enum(["owner", "staff", "customer"]),
});

export type SignUpBody = z.infer<typeof signUpSchema>;

// ─── Sign-in ─────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: emailField,
  password: passwordField,
});

export type SignInBody = z.infer<typeof signInSchema>;

// ─── Profile update ──────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required.").max(80).trim(),
  lastName: z.string().min(1, "Last name is required.").max(80).trim(),
  displayName: z.string().max(80).trim().optional(),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\+?[\d\s\-().]{7,20}$/.test(value),
      "Please enter a valid phone number."
    )
    .optional(),
  bio: z
    .string()
    .max(280, "Keep this note under 280 characters.")
    .optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;

// ─── Parse helper ─────────────────────────────────────────────────────────────

/**
 * Parses and validates the request body against `schema`.
 *
 * On failure throws an `AuthError("VALIDATION_ERROR")` whose message is the
 * first Zod issue, so route handlers never need to deal with raw ZodErrors.
 */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    throw new AuthError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const result = schema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];
    throw new AuthError(
      "VALIDATION_ERROR",
      firstIssue?.message ?? "Invalid request data."
    );
  }

  return result.data;
}

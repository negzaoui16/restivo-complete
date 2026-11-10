import { z } from "zod";
import { MAX_COMMENT_LENGTH } from "./rules";

export const createReviewSchema = z.object({
  rating: z
    .number({ error: "Choose a rating from 1 to 5." })
    .int("Choose a rating from 1 to 5.")
    .min(1, "Choose a rating from 1 to 5.")
    .max(5, "Choose a rating from 1 to 5."),
  comment: z
    .string()
    .trim()
    .max(MAX_COMMENT_LENGTH, `Keep the comment under ${MAX_COMMENT_LENGTH} characters.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type CreateReviewBody = z.infer<typeof createReviewSchema>;

export const reviewListSchema = z.object({
  page: z.coerce.number().int().min(1, "Page starts at 1.").max(1000).default(1),
  pageSize: z.coerce.number().int().min(1, "Page size is 1 to 50.").max(50, "Page size is 1 to 50.").default(10),
});

export function parseReviewListQuery(url: string): { page: number; pageSize: number } {
  const params = new URL(url).searchParams;
  const result = reviewListSchema.safeParse({
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
  });
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid page.");
  return result.data;
}

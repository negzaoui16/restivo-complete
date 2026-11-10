import { z } from "zod";

export const LIST_LIMIT = 40;

const limitField = {
  type: "integer",
  minimum: 1,
  maximum: LIST_LIMIT,
  description: `Rows to return. Anything above ${LIST_LIMIT} is reduced to ${LIST_LIMIT}.`,
};

export const noArgs = {
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  } as const,
  schema: z.object({}).strict(),
};

export const listArgs = {
  parameters: {
    type: "object",
    properties: { limit: limitField },
    additionalProperties: false,
  } as const,
  schema: z
    .object({
      limit: z
        .number()
        .int()
        .min(1)
        .optional()
        .transform((value) => Math.min(value ?? LIST_LIMIT, LIST_LIMIT)),
    })
    .strict(),
};

export type ListArgs = z.infer<typeof listArgs.schema>;

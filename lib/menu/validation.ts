import { z } from "zod";
import { parseRestaurantBody } from "@/lib/restaurants/validation";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrl = () =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const createMenuSchema = z.object({
  name: z.string().trim().min(2).max(80).default("Main menu"),
  description: optionalText(400),
});

export const updateMenuSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: optionalText(400),
  isPublished: z.boolean().optional(),
});

/** A decimal string ("18.500"); numbers from older callers are still accepted. The currency check is in the service. */
const priceInput = z.union([z.string().trim().min(1, "Price is required."), z.number()], {
  error: "Enter a price such as 18.500.",
});

export const reorderSchema = z.object({
  direction: z.enum(["up", "down"], { error: "Direction must be up or down." }),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required.").max(60),
  description: optionalText(240),
  imageUrl: optionalUrl(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: optionalText(240),
  imageUrl: optionalUrl(),
  isActive: z.boolean().optional(),
});

export const createItemSchema = z.object({
  categoryId: z.string().min(1, "Choose a category."),
  name: z.string().trim().min(2, "Item name is required.").max(80),
  description: optionalText(600),
  imageUrl: optionalUrl(),
  model3dUrl: optionalUrl(),
  price: priceInput,
  preparationTime: z.number().int().min(0).max(240).optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const updateItemSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(80).optional(),
  description: optionalText(600),
  imageUrl: optionalUrl(),
  model3dUrl: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  price: priceInput.optional(),
  preparationTime: z.number().int().min(0).max(240).nullable().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const createPromotionSchema = z
  .object({
    name: z.string().trim().min(2, "Promotion name is required.").max(80),
    description: optionalText(400),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    value: z.number().positive("Promotion value must be greater than 0."),
    startsAt: z.string().min(1, "Start date is required."),
    endsAt: z.string().min(1, "End date is required."),
    isActive: z.boolean().optional(),
    menuItemIds: z.array(z.string().min(1)).default([]),
  })
  .superRefine((body, ctx) => {
    if (body.type === "PERCENTAGE" && body.value > 100) {
      ctx.addIssue({ code: "custom", message: "Percentage cannot exceed 100." });
    }
  });

export const updatePromotionSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    description: optionalText(400),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).optional(),
    value: z.number().positive().optional(),
    startsAt: z.string().min(1).optional(),
    endsAt: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    menuItemIds: z.array(z.string().min(1)).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.type === "PERCENTAGE" && body.value !== undefined && body.value > 100) {
      ctx.addIssue({ code: "custom", message: "Percentage cannot exceed 100." });
    }
  });

export { parseRestaurantBody as parseMenuBody };

export type CreateMenuInput = z.input<typeof createMenuSchema>;
export type UpdateMenuInput = z.input<typeof updateMenuSchema>;
export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;
export type CreateItemInput = z.input<typeof createItemSchema>;
export type UpdateItemInput = z.input<typeof updateItemSchema>;
export type CreatePromotionInput = z.input<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.input<typeof updatePromotionSchema>;

export type ReorderBody = z.output<typeof reorderSchema>;
export type CreateMenuBody = z.output<typeof createMenuSchema>;
export type UpdateMenuBody = z.output<typeof updateMenuSchema>;
export type CreateCategoryBody = z.output<typeof createCategorySchema>;
export type UpdateCategoryBody = z.output<typeof updateCategorySchema>;
export type CreateItemBody = z.output<typeof createItemSchema>;
export type UpdateItemBody = z.output<typeof updateItemSchema>;
export type CreatePromotionBody = z.output<typeof createPromotionSchema>;
export type UpdatePromotionBody = z.output<typeof updatePromotionSchema>;

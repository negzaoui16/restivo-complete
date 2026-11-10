import { z } from "zod";
import { isFloorObjectType } from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";
import { parseRestaurantBody } from "@/lib/restaurants/validation";

const meters = z.number().min(4, "Use at least 4 m.").max(80, "Keep the floor under 80 m.");

const placedObjectSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.string().refine(isFloorObjectType, "Unknown floor object."),
  x: z.number().min(0).max(80),
  y: z.number().min(0).max(80),
  width: z.number().positive().max(80),
  height: z.number().positive().max(80),
  rotation: z.number().min(-360).max(360),
  zIndex: z.number().int().min(0).max(1000),
  locked: z.boolean(),
  metadata: z
    .object({
      capacity: z.number().int().min(0).max(100).optional(),
      label: z.string().trim().max(40).optional(),
    })
    .optional(),
});

export const createFloorSchema = z.object({
  name: z.string().trim().min(1, "Name this floor.").max(60),
  width: meters.default(18),
  height: meters.default(12),
});

export const updateFloorSchema = z.object({
  name: z.string().trim().min(1, "Name this floor.").max(60).optional(),
  width: meters.optional(),
  height: meters.optional(),
});

export const saveLayoutSchema = z.object({
  objects: z.array(placedObjectSchema).max(400),
  publish: z.boolean().optional(),
});

export const parseFloorBody = parseRestaurantBody;

export type CreateFloorBody = z.output<typeof createFloorSchema>;
export type UpdateFloorBody = z.output<typeof updateFloorSchema>;
export type SaveLayoutBody = z.output<typeof saveLayoutSchema>;

export const floorActiveSchema = z.object({
  isActive: z.boolean({ error: "Choose active or inactive." }),
});

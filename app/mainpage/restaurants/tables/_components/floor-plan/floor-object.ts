/** One placed item on the floor. Position and size are meters; rotation is degrees. */
export type FloorObjectType =
  | "ROUND_TABLE"
  | "SQUARE_TABLE"
  | "RECTANGLE_TABLE"
  | "BAR_TABLE"
  | "CHAIR"
  | "BENCH"
  | "BOOTH"
  | "KITCHEN"
  | "BAR"
  | "TOILET"
  | "STORAGE"
  | "RECEPTION"
  | "WALL"
  | "DOOR"
  | "WINDOW"
  | "COLUMN"
  | "STAIRS";

export interface FloorObject {
  id: string;
  type: FloorObjectType;

  x: number;
  y: number;

  width: number;
  height: number;

  rotation: number;

  zIndex: number;

  locked: boolean;

  metadata?: Record<string, unknown>;
}

export type FloorObjectGroup = "Tables" | "Seating" | "Areas" | "Structure";

export interface FloorObjectDefinition {
  type: FloorObjectType;
  label: string;
  group: FloorObjectGroup;
  width: number;
  height: number;
  metadata?: Record<string, unknown>;
}

export const FLOOR_OBJECT_CATALOG: Record<FloorObjectType, FloorObjectDefinition> = {
  ROUND_TABLE: { type: "ROUND_TABLE", label: "Round table", group: "Tables", width: 0.9, height: 0.9, metadata: { capacity: 4 } },
  SQUARE_TABLE: { type: "SQUARE_TABLE", label: "Square table", group: "Tables", width: 0.9, height: 0.9, metadata: { capacity: 4 } },
  RECTANGLE_TABLE: { type: "RECTANGLE_TABLE", label: "Rectangle table", group: "Tables", width: 1.6, height: 0.85, metadata: { capacity: 6 } },
  BAR_TABLE: { type: "BAR_TABLE", label: "Bar table", group: "Tables", width: 0.65, height: 0.65, metadata: { capacity: 2 } },
  CHAIR: { type: "CHAIR", label: "Chair", group: "Seating", width: 0.45, height: 0.5 },
  BENCH: { type: "BENCH", label: "Bench", group: "Seating", width: 1.8, height: 0.48, metadata: { capacity: 3 } },
  BOOTH: { type: "BOOTH", label: "Booth", group: "Seating", width: 1.6, height: 0.9, metadata: { capacity: 4 } },
  KITCHEN: { type: "KITCHEN", label: "Kitchen", group: "Areas", width: 3.4, height: 2.6 },
  BAR: { type: "BAR", label: "Bar", group: "Areas", width: 3.2, height: 1.15, metadata: { capacity: 6 } },
  TOILET: { type: "TOILET", label: "Toilet", group: "Areas", width: 1.35, height: 1.8 },
  STORAGE: { type: "STORAGE", label: "Storage", group: "Areas", width: 1.2, height: 0.8 },
  RECEPTION: { type: "RECEPTION", label: "Reception", group: "Areas", width: 1.8, height: 0.7 },
  WALL: { type: "WALL", label: "Wall", group: "Structure", width: 2, height: 0.2 },
  DOOR: { type: "DOOR", label: "Door", group: "Structure", width: 0.9, height: 0.9 },
  WINDOW: { type: "WINDOW", label: "Window", group: "Structure", width: 1.4, height: 0.2 },
  COLUMN: { type: "COLUMN", label: "Column", group: "Structure", width: 0.4, height: 0.4 },
  STAIRS: { type: "STAIRS", label: "Stairs", group: "Structure", width: 1.2, height: 2.4 },
};

export const FLOOR_OBJECT_TYPES = Object.keys(FLOOR_OBJECT_CATALOG) as FloorObjectType[];

export function isFloorObjectType(value: string): value is FloorObjectType {
  return Object.prototype.hasOwnProperty.call(FLOOR_OBJECT_CATALOG, value);
}

export function createFloorObject(
  type: FloorObjectType,
  overrides: Partial<Omit<FloorObject, "type">> = {},
): FloorObject {
  const definition = FLOOR_OBJECT_CATALOG[type];
  const metadata = { ...definition.metadata, ...overrides.metadata };

  return {
    id: overrides.id ?? crypto.randomUUID(),
    type,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? definition.width,
    height: overrides.height ?? definition.height,
    rotation: overrides.rotation ?? 0,
    zIndex: overrides.zIndex ?? 0,
    locked: overrides.locked ?? false,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

export function objectCapacity(object: FloorObject) {
  const own = object.metadata?.capacity;
  if (typeof own === "number" && Number.isFinite(own)) return own;
  const fallback = FLOOR_OBJECT_CATALOG[object.type].metadata?.capacity;
  return typeof fallback === "number" ? fallback : undefined;
}

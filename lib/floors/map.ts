import {
  isFloorObjectType,
  objectCapacity,
  type FloorObject,
  type FloorObjectType,
} from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";
import { BASE_METER_PX } from "@/app/mainpage/restaurants/tables/_components/floor-plan/editor/constants";

const LEGACY_PIXEL_SIZE = 80;

const TABLE_SYMBOLS = new Set<FloorObjectType>([
  "ROUND_TABLE",
  "SQUARE_TABLE",
  "RECTANGLE_TABLE",
  "BAR_TABLE",
  "BOOTH",
]);

type StoredKind = "TABLE" | "CHAIR" | "BAR" | "WALL" | "DOOR" | "WINDOW" | "SOFA" | "COUNTER" | "DECORATION" | "OTHER";
type StoredTableKind = "STANDARD" | "BOOTH" | "BAR" | "OUTDOOR" | "PRIVATE" | "OTHER";

export type StoredObjectData = {
  editorType: FloorObjectType;
  capacity?: number;
  locked: boolean;
  label?: string;
};

export function isTableSymbol(type: FloorObjectType) {
  return TABLE_SYMBOLS.has(type);
}

export function metersFromStorage(value: unknown) {
  const parsed = toNumber(value);
  const meters = parsed > LEGACY_PIXEL_SIZE ? parsed / BASE_METER_PX : parsed;
  return round(meters);
}

export function storedKind(type: FloorObjectType): StoredKind {
  if (isTableSymbol(type)) return "TABLE";
  if (type === "CHAIR") return "CHAIR";
  if (type === "BENCH") return "SOFA";
  if (type === "BAR") return "BAR";
  if (type === "WALL") return "WALL";
  if (type === "DOOR") return "DOOR";
  if (type === "WINDOW") return "WINDOW";
  return "OTHER";
}

export function storedTableKind(type: FloorObjectType): StoredTableKind {
  if (type === "BOOTH") return "BOOTH";
  if (type === "BAR_TABLE") return "BAR";
  return "STANDARD";
}

export function objectData(object: FloorObject): StoredObjectData {
  const capacity = objectCapacity(object);
  const label = readLabel(object);
  return {
    editorType: object.type,
    locked: object.locked,
    ...(capacity != null ? { capacity } : {}),
    ...(label ? { label } : {}),
  };
}

export function tableLabel(object: FloorObject, index: number) {
  return readLabel(object) ?? `T${String(index + 1).padStart(2, "0")}`;
}

export function editorObjectFromStored(row: {
  id: string;
  type: string;
  name: string | null;
  x: unknown;
  y: unknown;
  width: unknown;
  height: unknown;
  rotation: unknown;
  zIndex: number;
  isVisible: boolean;
  data: unknown;
}): FloorObject | null {
  const data = readData(row.data);
  const width = metersFromStorage(row.width);
  const height = metersFromStorage(row.height);
  const type = resolveEditorType(data.editorType, row.type, width, height);
  if (!type) return null;

  const label = data.label ?? row.name ?? undefined;
  const capacity = data.capacity;

  return {
    id: row.id,
    type,
    x: metersFromStorage(row.x),
    y: metersFromStorage(row.y),
    width,
    height,
    rotation: round(toNumber(row.rotation)),
    zIndex: row.zIndex,
    locked: data.locked || !row.isVisible,
    ...(label || capacity != null
      ? { metadata: { ...(label ? { label } : {}), ...(capacity != null ? { capacity } : {}) } }
      : {}),
  };
}

export function editorObjectFromTable(row: {
  id: string;
  name: string;
  type: string;
  capacity: number;
  x: unknown;
  y: unknown;
  width: unknown;
  height: unknown;
  rotation: unknown;
}): FloorObject {
  const width = metersFromStorage(row.width);
  const height = metersFromStorage(row.height);
  const type = tableSymbol(row.type, width, height);

  return {
    id: row.id,
    type,
    x: metersFromStorage(row.x),
    y: metersFromStorage(row.y),
    width,
    height,
    rotation: round(toNumber(row.rotation)),
    zIndex: 1,
    locked: false,
    metadata: { label: row.name, capacity: row.capacity },
  };
}

function tableSymbol(kind: string, width: number, height: number): FloorObjectType {
  if (kind === "BOOTH") return "BOOTH";
  if (kind === "BAR") return "BAR_TABLE";
  return width === height ? "ROUND_TABLE" : "RECTANGLE_TABLE";
}

function resolveEditorType(stored: string | undefined, kind: string, width: number, height: number): FloorObjectType | null {
  if (stored && isFloorObjectType(stored)) return stored;
  if (kind === "CHAIR") return "CHAIR";
  if (kind === "BAR") return "BAR";
  if (kind === "WALL") return "WALL";
  if (kind === "DOOR") return "DOOR";
  if (kind === "WINDOW") return "WINDOW";
  if (kind === "SOFA") return "BENCH";
  if (kind === "TABLE") return width === height ? "ROUND_TABLE" : "RECTANGLE_TABLE";
  return "STORAGE";
}

function readLabel(object: FloorObject) {
  const label = object.metadata?.label;
  if (typeof label !== "string") return null;
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readData(value: unknown): {
  editorType?: string;
  capacity?: number;
  locked?: boolean;
  label?: string;
} {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return {
    editorType: typeof record.editorType === "string" ? record.editorType : undefined,
    capacity: typeof record.capacity === "number" ? record.capacity : undefined,
    locked: record.locked === true,
    label: typeof record.label === "string" ? record.label : undefined,
  };
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

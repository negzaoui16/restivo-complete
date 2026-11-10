import { FLOOR_OBJECT_CATALOG, objectCapacity } from "../_components/floor-plan/floor-object";
import { isTableSymbol } from "@/lib/floors/map";
import type { PublicFloor } from "@/lib/floors/types";
import type { TableRow } from "./tables-ui";

export function rowsForFloor(floor: PublicFloor | null): TableRow[] {
  if (!floor) return [];
  return floor.objects.filter((object) => isTableSymbol(object.type)).map((object, index) => ({
    num: labelOf(object, index),
    cap: objectCapacity(object) ?? 0,
    shape: FLOOR_OBJECT_CATALOG[object.type].label,
    status: "Available",
    statusColor: "text-green-700 bg-green-100",
  }));
}

function labelOf(object: PublicFloor["objects"][number], index: number) {
  const label = object.metadata?.label;
  if (typeof label === "string" && label.trim()) return label.trim();
  return `T${String(index + 1).padStart(2, "0")}`;
}

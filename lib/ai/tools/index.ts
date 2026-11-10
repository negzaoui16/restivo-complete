import { canManageRestaurant } from "@/lib/restaurants/access";
import { getFloors } from "./floors/get-floors";
import { getMenu } from "./menu/get-menu";
import { getReservations } from "./reservations/get-reservations";
import { getTablesStatus } from "./reservations/get-tables-status";
import { getRestaurant } from "./restaurant/get-restaurant";
import { getStaff } from "./staff/get-staff";
import { createRegistry, type ToolAccess } from "./registry";

/** Allowlist. Append a tool here to expose it. Order is the order the model sees. */
const registry = createRegistry(
  [getRestaurant, getFloors, getMenu, getStaff, getReservations, getTablesStatus],
  canManageRestaurant
);

export function groqTools() {
  return registry.schemas();
}

export function runManagerTool(name: string, access: ToolAccess, rawArguments?: string) {
  return registry.run(name, access, rawArguments);
}

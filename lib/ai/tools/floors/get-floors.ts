import { listFloors } from "@/lib/floors/service";
import { isTableSymbol, tableLabel } from "@/lib/floors/map";
import { objectCapacity } from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";
import { listArgs, type ListArgs } from "../args";
import { defineTool } from "../types";

export const getFloors = defineTool({
  name: "get_floors",
  description: "Read the floors and active tables for this restaurant, including each table name and seat count. Optional limit caps how many tables are returned.",
  parameters: listArgs.parameters,
  schema: listArgs.schema,
  run: readFloors,
});

async function readFloors(restaurantId: string, args: ListArgs) {
  const floors = await listFloors(restaurantId);
  let left = args.limit;
  let total = 0;

  const rows = floors.map((floor) => {
    const tables = floor.objects.filter((object) => isTableSymbol(object.type));
    total += tables.length;
    const visible = tables.slice(0, left);
    left -= visible.length;
    return {
      name: floor.name,
      level: floor.level,
      active: floor.isActive,
      seats: floor.seatCount,
      tableCount: tables.length,
      tables: visible.map((table, index) => ({
        name: tableLabel(table, index),
        seats: objectCapacity(table) ?? null,
      })),
    };
  });

  return {
    floorCount: rows.length,
    tableCount: total,
    limit: args.limit,
    truncated: total > args.limit,
    floors: rows,
  };
}

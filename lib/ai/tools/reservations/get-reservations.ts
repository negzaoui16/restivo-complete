import { listReservations } from "@/lib/manager/service";
import { defineTool } from "../types";
import { reservationArgs, type ReservationArgs } from "./args";
import { shapeReservations } from "./shape";

export const getReservations = defineTool({
  name: "get_reservations",
  description:
    "Read the reservations of one local day (today by default): time, table, guests, status, customer, notes. Optional status and limit.",
  parameters: reservationArgs.parameters,
  schema: reservationArgs.schema,
  run: readReservations,
});

async function readReservations(restaurantId: string, args: ReservationArgs) {
  const list = await listReservations(restaurantId, { date: args.date, status: args.status ? [args.status] : undefined });
  return shapeReservations(list, args.limit);
}

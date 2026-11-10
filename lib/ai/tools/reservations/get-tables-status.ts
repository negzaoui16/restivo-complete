import { getLiveState } from "@/lib/live/service";
import { liveDisplay } from "@/lib/live/state";
import { listArgs, type ListArgs } from "../args";
import { defineTool } from "../types";
import { shapeTables } from "./shape";

export const getTablesStatus = defineTool({
  name: "get_tables_status",
  description:
    "Read the live state of every table on the active floors right now: free, reserved soon, waiting, occupied or overdue, with the current and next guests. Optional limit caps the tables returned.",
  parameters: listArgs.parameters,
  schema: listArgs.schema,
  run: readTablesStatus,
});

async function readTablesStatus(restaurantId: string, args: ListArgs) {
  // Read only: asking the assistant must not write live alerts.
  const live = await getLiveState(restaurantId, { alerts: false });
  const nowMs = Date.parse(live.now);
  return shapeTables(live, args.limit, (table) =>
    liveDisplay(
      table.state,
      table.current ? { status: table.current.status, startsAtMs: Date.parse(table.current.startsAt) } : null,
      nowMs,
    ).label,
  );
}

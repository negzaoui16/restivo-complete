import { loadRoster } from "@/lib/staff/roster";
import { listArgs, type ListArgs } from "../args";
import { defineTool } from "../types";

export const getStaff = defineTool({
  name: "get_staff",
  description: "Read the active staff at this restaurant and the pending requests to join. Optional limit caps both lists.",
  parameters: listArgs.parameters,
  schema: listArgs.schema,
  run: readStaff,
});

async function readStaff(restaurantId: string, args: ListArgs) {
  const roster = await loadRoster(restaurantId);

  return {
    teamCount: roster.members.length,
    requestCount: roster.requests.length,
    limit: args.limit,
    truncated: roster.members.length > args.limit || roster.requests.length > args.limit,
    team: roster.members.slice(0, args.limit).map((member) => ({ name: member.name, since: member.since })),
    joinRequests: roster.requests.slice(0, args.limit).map((request) => ({
      name: request.name,
      message: request.message,
      sentAt: request.sentAt,
    })),
  };
}

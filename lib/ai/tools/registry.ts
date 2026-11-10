import type { AnswerSource } from "../types";
import type { AiTool } from "./types";

const BLOCKED_KEYS = new Set(["restaurantId", "restaurant_id", "userId", "user_id"]);

export type ToolAccess = {
  userId: string;
  restaurantId: string;
};

type Authorize = (userId: string, restaurantId: string) => Promise<boolean>;

export function createRegistry(tools: AiTool[], authorize: Authorize) {
  const allowed = new Map(tools.map((tool) => [tool.name, tool]));

  return {
    schemas() {
      return tools.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
    },
    async run(name: string, access: ToolAccess, rawArguments?: string) {
      if (!access.userId || !access.restaurantId) return { error: "Missing restaurant access." };

      const tool = allowed.get(name);
      if (!tool) return { error: "That tool is not allowed." };

      const parsed = parseArguments(rawArguments);
      if (!parsed.ok) return { error: parsed.error };
      if (blockedKey(parsed.value)) {
        return { error: "Restaurant access comes from the signed-in manager, not from the model." };
      }

      const permitted = await authorize(access.userId, access.restaurantId);
      if (!permitted) return { error: "You cannot manage this restaurant." };

      const args = tool.schema.safeParse(parsed.value);
      if (!args.success) {
        return { error: args.error.issues[0]?.message ?? "Invalid tool arguments." };
      }

      try {
        const data = await tool.run(access.restaurantId, args.data as never);
        return { source: describeSource(name, data), data };
      } catch (err) {
        console.error("[ai] tool failed", name, err instanceof Error ? err.message : "");
        return { error: "This lookup failed." };
      }
    },
  };
}

function parseArguments(raw?: string): { ok: true; value: unknown } | { ok: false; error: string } {
  if (!raw?.trim()) return { ok: true, value: {} };
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "Tool arguments must be an object." };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Tool arguments must be valid JSON." };
  }
}

function blockedKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.keys(value).some((key) => BLOCKED_KEYS.has(key));
}

const TOOL_LABELS: Record<string, string> = {
  get_restaurant: "Restaurant",
  get_floors: "Floors",
  get_menu: "Menu",
  get_staff: "Staff",
  get_reservations: "Reservations",
  get_tables_status: "Tables now",
};

export function describeSource(tool: string, data: unknown): AnswerSource {
  const row = isRecord(data) ? data : {};
  const label = TOOL_LABELS[tool] ?? "Query";
  const context = queryContext(row);

  if (row.found === false) {
    return { tool, label, metric: "No records", records: [], context };
  }

  if (tool === "get_menu") {
    const count = asNumber(row.itemCount);
    return {
      tool,
      label,
      metric: count === null ? "Menu query" : `${count} active menu items`,
      records: names(row.name),
      context,
    };
  }

  if (tool === "get_floors") {
    const floors = asNumber(row.floorCount);
    const tables = asNumber(row.tableCount);
    return {
      tool,
      label,
      metric: floors === null || tables === null ? "Floor query" : `${floors} floors, ${tables} tables`,
      records: floorNames(row.floors),
      context,
    };
  }

  if (tool === "get_staff") {
    const team = asNumber(row.teamCount);
    const requests = asNumber(row.requestCount);
    return {
      tool,
      label,
      metric: team === null || requests === null ? "Staff query" : `${team} active staff, ${requests} join requests`,
      records: personNames(row.team),
      context,
    };
  }

  if (tool === "get_reservations") {
    const count = asNumber(row.count);
    const day = typeof row.from === "string" ? row.from : null;
    return {
      tool,
      label,
      metric: count === null ? "Reservation query" : `${count} ${count === 1 ? "reservation" : "reservations"}${day ? ` on ${day}` : ""}`,
      records: reservationNames(row.reservations),
      context,
    };
  }

  if (tool === "get_tables_status") {
    const tables = asNumber(row.tableCount);
    const counts = isRecord(row.counts) ? row.counts : {};
    const busy = (asNumber(counts.OCCUPIED) ?? 0) + (asNumber(counts.OVERDUE) ?? 0);
    return {
      tool,
      label,
      metric: tables === null ? "Table status query" : `${tables} tables, ${busy} occupied`,
      records: tableNames(row.tables),
      context,
    };
  }

  return {
    tool,
    label,
    metric: typeof row.name === "string" ? `${row.name} profile and weekly hours` : "Restaurant profile and weekly hours",
    records: names(row.name),
    context,
  };
}

function queryContext(row: Record<string, unknown>): string {
  const parts = ["Signed-in restaurant"];
  if (row.truncated === true && typeof row.limit === "number") parts.push(`first ${row.limit} shown`);
  return parts.join(" · ");
}

function floorNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((floor) => (isRecord(floor) && typeof floor.name === "string" ? floor.name : ""))
    .filter(Boolean)
    .slice(0, 4);
}

function reservationNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (isRecord(entry) && typeof entry.customer === "string" ? entry.customer : ""))
    .filter(Boolean)
    .slice(0, 3);
}

function tableNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (isRecord(entry) && typeof entry.name === "string" ? entry.name : ""))
    .filter(Boolean)
    .slice(0, 4);
}

function personNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((person) => (isRecord(person) && typeof person.name === "string" ? person.name : ""))
    .filter(Boolean)
    .slice(0, 3);
}

function names(value: unknown): string[] {
  return typeof value === "string" && value.trim() ? [value.trim()] : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

import type { FollowUp } from "./types";

const MAX_FOLLOW_UPS = 3;
const MAX_OPTIONS = 6;
const VALUE_LIMIT = 80;

export type ToolLookup = {
  tool: string;
  data: unknown;
};

/** Questions for an empty thread. Each one maps to a tool the assistant can run. */
export const STARTER_FOLLOW_UPS: FollowUp[] = [
  ask("start-menu", "Show me the menu"),
  ask("start-floors", "Show me the floors and tables"),
  ask("start-staff", "Who is on the team?"),
  ask("start-hours", "What are our opening hours?"),
];

/** Next questions from tool payloads. Nothing here mentions reservations, orders, or sales. */
export function suggestFollowUps(lookups: ToolLookup[]): FollowUp[] {
  const useful = lookups.filter((lookup) => isRecord(lookup.data) && lookup.data.found !== false);
  const last = useful.at(-1);
  if (!last || !isRecord(last.data)) return [];

  const primary = forTool(last.tool, last.data);
  const earlier = useful.slice(0, -1).flatMap((lookup) => (isRecord(lookup.data) ? forTool(lookup.tool, lookup.data) : []));
  return uniqueById([...primary, ...earlier]).slice(0, MAX_FOLLOW_UPS);
}

export function followUpText(prompt: string, value: string): string {
  const clean = value.trim().replace(/\s+/g, " ").slice(0, VALUE_LIMIT);
  if (!clean || !prompt.includes("{value}")) return "";
  return prompt.replaceAll("{value}", clean);
}

export function asFollowUps(value: unknown): FollowUp[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const next = asFollowUp(item);
    return next ? [next] : [];
  }).slice(0, MAX_FOLLOW_UPS);
}

function forTool(tool: string, data: Record<string, unknown>): FollowUp[] {
  if (tool === "get_menu") return menuFollowUps(data);
  if (tool === "get_floors") return floorFollowUps(data);
  if (tool === "get_staff") return staffFollowUps(data);
  if (tool === "get_restaurant") return restaurantFollowUps(data);
  return [];
}

function menuFollowUps(data: Record<string, unknown>): FollowUp[] {
  const categories = readCategories(data);
  const items = categories.flatMap((category) => category.items);
  if (items.length === 0) return [];

  const priced = items.filter((item) => typeof item.price === "number");
  const askNext = items.some((item) => item.price == null)
    ? ask("menu-unpriced", "Which menu items have no price?")
    : priced.length >= 2
      ? ask("menu-expensive", "Which items are the most expensive?")
      : items.some((item) => item.available === false)
        ? ask("menu-unavailable", "Which dishes are unavailable?")
        : null;

  const names = unique(categories.map((category) => category.name)).slice(0, MAX_OPTIONS);
  const pick = names.length > 0 ? choice("menu-category", "Choose a category", "Show me the items in {value}.", names) : null;
  const write = note("menu-find", "Type a dish name", "Dish name", "Find menu items named {value}.");

  return [askNext, pick, write].filter((item): item is FollowUp => item !== null);
}

function floorFollowUps(data: Record<string, unknown>): FollowUp[] {
  const floors = readFloors(data);
  if (floors.length === 0) return [];

  const tables = floors.flatMap((floor) => floor.tables);
  const askNext = floors.some((floor) => floor.tableCount === 0)
    ? ask("floors-empty", "Which floors have no tables?")
    : tables.some((table) => typeof table.seats === "number")
      ? ask("floors-seats", "Which tables have the most seats?")
      : null;

  const names = unique(floors.map((floor) => floor.name)).slice(0, MAX_OPTIONS);
  const pick = names.length > 0 ? choice("floors-pick", "Choose a floor", "Show me the tables on {value}.", names) : null;
  const write = tables.length > 0 ? note("floors-find", "Type a table name", "Table name", "Find the table named {value}.") : null;

  return [askNext, pick, write].filter((item): item is FollowUp => item !== null);
}

function staffFollowUps(data: Record<string, unknown>): FollowUp[] {
  const team = readPeople(data.team);
  const requests = readPeople(data.joinRequests);
  if (team.length === 0 && requests.length === 0) return [];

  const askNext = requests.length > 0
    ? ask("staff-requests", "Who has asked to join?")
    : team.length >= 2
      ? ask("staff-longest", "Who has been on the team the longest?")
      : null;

  const names = unique(team.map((person) => person.name)).slice(0, MAX_OPTIONS);
  const pick = names.length > 0 ? choice("staff-pick", "Choose a person", "When did {value} join the team?", names) : null;
  const write = note("staff-find", "Type a name", "Name", "Is {value} on the team?");

  return [askNext, pick, write].filter((item): item is FollowUp => item !== null);
}

function restaurantFollowUps(data: Record<string, unknown>): FollowUp[] {
  const hours = readHours(data.hours);
  if (hours.length === 0) return [];

  const askNext = hours.some((day) => day.closed)
    ? ask("place-closed", "Which days are we closed?")
    : ask("place-hours", "What are the opening hours?");

  const days = unique(hours.map((day) => day.day)).slice(0, MAX_OPTIONS);
  const pick = days.length > 0 ? choice("place-day", "Choose a day", "What are the hours on {value}?", days) : null;

  return [askNext, pick].filter((item): item is FollowUp => item !== null);
}

function ask(id: string, prompt: string): FollowUp {
  return { id, kind: "ask", label: prompt, prompt };
}

function choice(id: string, label: string, prompt: string, options: string[]): FollowUp {
  return { id, kind: "pick", label, prompt, options };
}

function note(id: string, label: string, placeholder: string, prompt: string): FollowUp {
  return { id, kind: "write", label, placeholder, prompt };
}

function readCategories(data: Record<string, unknown>): { name: string; items: MenuRow[] }[] {
  if (!Array.isArray(data.categories)) return [];
  return data.categories.flatMap((category) => {
    if (!isRecord(category) || typeof category.name !== "string" || !category.name.trim()) return [];
    const items = Array.isArray(category.items) ? category.items.flatMap(readItem) : [];
    return [{ name: category.name.trim(), items }];
  });
}

type MenuRow = { price: number | null; available: boolean | null };

function readItem(value: unknown): MenuRow[] {
  if (!isRecord(value)) return [];
  return [{
    price: typeof value.price === "number" ? value.price : null,
    available: typeof value.available === "boolean" ? value.available : null,
  }];
}

function readFloors(data: Record<string, unknown>): { name: string; tableCount: number; tables: { seats: number | null }[] }[] {
  if (!Array.isArray(data.floors)) return [];
  return data.floors.flatMap((floor) => {
    if (!isRecord(floor) || typeof floor.name !== "string" || !floor.name.trim()) return [];
    const tables = Array.isArray(floor.tables) ? floor.tables.flatMap(readTable) : [];
    const tableCount = typeof floor.tableCount === "number" ? floor.tableCount : tables.length;
    return [{ name: floor.name.trim(), tableCount, tables }];
  });
}

function readTable(value: unknown): { seats: number | null }[] {
  if (!isRecord(value)) return [];
  return [{ seats: typeof value.seats === "number" ? value.seats : null }];
}

function readPeople(value: unknown): { name: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((person) => {
    if (!isRecord(person) || typeof person.name !== "string" || !person.name.trim()) return [];
    return [{ name: person.name.trim() }];
  });
}

function readHours(value: unknown): { day: string; closed: boolean }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((day) => {
    if (!isRecord(day) || typeof day.day !== "string" || !day.day.trim()) return [];
    return [{ day: day.day.trim(), closed: day.closed === true }];
  });
}

function asFollowUp(value: unknown): FollowUp | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 40);
  const label = text(value.label, 80);
  const prompt = text(value.prompt, 160);
  if (!id || !label || !prompt) return null;

  if (value.kind === "ask") return { id, kind: "ask", label, prompt };
  if (value.kind === "pick" && prompt.includes("{value}")) {
    const options = readOptions(value.options);
    return options.length > 0 ? { id, kind: "pick", label, prompt, options } : null;
  }
  if (value.kind === "write" && prompt.includes("{value}")) {
    const placeholder = text(value.placeholder, 40);
    return placeholder ? { id, kind: "write", label, prompt, placeholder } : null;
  }
  return null;
}

function readOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return unique(value.flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim()] : []))).slice(0, MAX_OPTIONS);
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function uniqueById(items: FollowUp[]): FollowUp[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

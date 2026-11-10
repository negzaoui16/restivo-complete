import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createRegistry, type ToolAccess } from "../registry.ts";
import { liveDisplay } from "../../../live/state.ts";
import { reservationArgs } from "./args.ts";
import { shapeReservations, shapeTables, type LiveInput, type ReservationListInput } from "./shape.ts";

const ownerA: ToolAccess = { userId: "owner-a", restaurantId: "restaurant-a" };
const ownsA = (userId: string, restaurantId: string) =>
  Promise.resolve(userId === ownerA.userId && restaurantId === ownerA.restaurantId);

/** The two new tools with their real argument schemas and a stub that records the restaurant. */
function registryFor(calls: string[], result: unknown = {}) {
  const run = (name: string) => (restaurantId: string) => {
    calls.push(`${name}:${restaurantId}`);
    return Promise.resolve(result);
  };
  return createRegistry(
    [
      {
        name: "get_reservations",
        description: "reservations",
        parameters: reservationArgs.parameters,
        schema: reservationArgs.schema,
        run: run("get_reservations"),
      },
      {
        name: "get_tables_status",
        description: "tables",
        parameters: { type: "object" as const, properties: {}, additionalProperties: false as const },
        schema: z.object({}).strict(),
        run: run("get_tables_status"),
      },
    ],
    ownsA,
  );
}

const statusOf = (table: LiveInput["tables"][number]) =>
  liveDisplay(
    table.state,
    table.current ? { status: table.current.status, startsAtMs: Date.parse(table.current.startsAt) } : null,
    Date.parse(LIVE.now),
  ).label;

const NAMES = ["get_reservations", "get_tables_status"] as const;

test("the new tools cannot read another restaurant", async () => {
  const calls: string[] = [];
  const registry = registryFor(calls);
  for (const name of NAMES) {
    const result = (await registry.run(name, { userId: "owner-a", restaurantId: "restaurant-b" }, "{}")) as { error?: string };
    assert.equal(typeof result.error, "string");
  }
  assert.deepEqual(calls, []);
});

test("the new tools refuse a restaurant id or user id from the model", async () => {
  const calls: string[] = [];
  const registry = registryFor(calls);
  for (const name of NAMES) {
    for (const key of ["restaurantId", "restaurant_id", "userId", "user_id"]) {
      const result = (await registry.run(name, ownerA, JSON.stringify({ [key]: "restaurant-b" }))) as { error?: string };
      assert.equal(typeof result.error, "string", `${name} with ${key}`);
    }
  }
  assert.deepEqual(calls, []);
});

test("the new tools only receive the authorized restaurant", async () => {
  const calls: string[] = [];
  const registry = registryFor(calls);
  for (const name of NAMES) await registry.run(name, ownerA, "{}");
  assert.deepEqual(calls, ["get_reservations:restaurant-a", "get_tables_status:restaurant-a"]);
});

test("get_reservations checks its arguments", async () => {
  const registry = registryFor([]);
  const bad = async (args: unknown) => ((await registry.run("get_reservations", ownerA, JSON.stringify(args))) as { error?: string }).error;
  assert.match((await bad({ date: "3 November" })) ?? "", /date/i);
  assert.equal(typeof (await bad({ status: "DELETED" })), "string");
  assert.equal(typeof (await bad({ everything: true })), "string");
  assert.equal(await bad({ date: "2026-11-03", status: "CONFIRMED", limit: 5 }), undefined);
});

test("get_reservations reduces a limit above 40", () => {
  assert.equal(reservationArgs.schema.parse({ limit: 100000 }).limit, 40);
  assert.equal(reservationArgs.schema.parse({}).limit, 40);
  assert.equal(reservationArgs.schema.parse({ limit: 3 }).limit, 3);
});

const LIST: ReservationListInput = {
  timezone: "Africa/Tunis",
  from: "2026-11-03",
  to: "2026-11-03",
  reservations: [
    {
      status: "CONFIRMED",
      startsAt: "2026-11-03T18:00:00Z",
      endsAt: "2026-11-03T19:30:00Z",
      guestCount: 4,
      notes: "Window seat",
      table: { name: "T14" },
      customer: { name: "Sarah" },
      orders: [{ status: "PENDING" }, { status: "CANCELLED" }],
    },
    {
      status: "SEATED",
      startsAt: "2026-11-03T19:00:00Z",
      endsAt: "2026-11-03T20:30:00Z",
      guestCount: 2,
      notes: null,
      table: { name: "T02" },
      customer: { name: "Yassine" },
      orders: [],
    },
  ],
};

test("reservations are shaped with local times and without ids or money", () => {
  const shaped = shapeReservations(LIST, 40);
  assert.equal(shaped.count, 2);
  assert.equal(shaped.truncated, false);
  assert.deepEqual(shaped.reservations[0], {
    from: "19:00", // Tunis is UTC+1 in November
    until: "20:30",
    table: "T14",
    guests: 4,
    status: "CONFIRMED",
    customer: "Sarah",
    notes: "Window seat",
    preOrders: 1,
  });
  const text = JSON.stringify(shaped).toLowerCase();
  for (const word of ["id\"", "code", "total", "price", "currency"]) assert.equal(text.includes(word), false, word);
});

test("reservations say when they are cut", () => {
  const shaped = shapeReservations(LIST, 1);
  assert.equal(shaped.count, 2);
  assert.equal(shaped.truncated, true);
  assert.equal(shaped.reservations.length, 1);
});

const LIVE: LiveInput = {
  now: "2026-11-03T18:07:00Z",
  timezone: "Africa/Tunis",
  floors: [{ id: "f1", name: "Main" }],
  tables: [
    { name: "T01", floorId: "f1", capacity: 2, state: "FREE", current: null, next: null },
    {
      name: "T14",
      floorId: "f1",
      capacity: 4,
      state: "RESERVED_SOON",
      current: { status: "CONFIRMED", startsAt: "2026-11-03T18:00:00Z", endsAt: "2026-11-03T19:30:00Z", guestCount: 4, customerName: "Sarah" },
      next: null,
    },
    {
      name: "T02",
      floorId: "f1",
      capacity: 2,
      state: "OCCUPIED",
      current: { status: "SEATED", startsAt: "2026-11-03T17:30:00Z", endsAt: "2026-11-03T19:00:00Z", guestCount: 2, customerName: "Yassine" },
      next: { status: "CONFIRMED", startsAt: "2026-11-03T19:00:00Z", endsAt: "2026-11-03T20:30:00Z", guestCount: 3, customerName: "Mehdi" },
    },
  ],
};

test("tables are shaped with counts, the waiting wording and the next guests", () => {
  const shaped = shapeTables(LIVE, 40, statusOf);
  assert.deepEqual(shaped.counts, { FREE: 1, RESERVED_SOON: 1, OCCUPIED: 1, OVERDUE: 0 });
  assert.equal(shaped.tableCount, 3);
  assert.equal(shaped.now, "19:07");
  const [free, waiting, busy] = shaped.tables;
  assert.equal(free.status, "Free");
  assert.equal(free.current, null);
  assert.equal(waiting.status, "Waiting · 7 min late");
  assert.equal(busy.status, "Occupied");
  assert.equal(busy.floor, "Main");
  assert.deepEqual(busy.next, { customer: "Mehdi", guests: 3, at: "20:00" });
});

test("tables say when they are cut", () => {
  const shaped = shapeTables(LIVE, 2, statusOf);
  assert.equal(shaped.truncated, true);
  assert.equal(shaped.tables.length, 2);
  assert.equal(shaped.tableCount, 3);
});

test("the sources name the day, the count and the guests", async () => {
  const reservations = registryFor([], shapeReservations(LIST, 40));
  const one = (await reservations.run("get_reservations", ownerA, "{}")) as { source?: { metric?: string; records?: string[]; label?: string } };
  assert.equal(one.source?.metric, "2 reservations on 2026-11-03");
  assert.deepEqual(one.source?.records, ["Sarah", "Yassine"]);
  assert.equal(one.source?.label, "Reservations");

  const tables = registryFor([], shapeTables(LIVE, 40, statusOf));
  const two = (await tables.run("get_tables_status", ownerA, "{}")) as { source?: { metric?: string; records?: string[] } };
  assert.equal(two.source?.metric, "3 tables, 1 occupied");
  assert.deepEqual(two.source?.records, ["T01", "T14", "T02"]);
});

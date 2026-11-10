/**
 * Live floor state and alerts, against a running dev server and its database.
 *
 *   npm run test:integration      (loads .env, server on RESTIVO_BASE_URL or :3000)
 *
 * Skipped when DATABASE_URL is absent, or when the server does not answer.
 * It creates its own throwaway users and restaurant and removes everything it
 * created (by exact id) when it finishes. To test time windows it moves the
 * start of its own test reservations directly in the database.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Temporal } from "temporal-polyfill";

const BASE = process.env.RESTIVO_BASE_URL ?? "http://localhost:3000";
const HAS_DB = Boolean(process.env.DATABASE_URL);

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function call(method: string, path: string, token: string | null, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Json;
  return { status: res.status, json };
}

async function serverIsUp() {
  try {
    await fetch(BASE + "/api/auth/me", { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

const up = HAS_DB && (await serverIsUp());
const skip = !HAS_DB ? "DATABASE_URL is not set" : !up ? `no server answering at ${BASE}` : false;

async function openDb() {
  const [{ default: postgres }, { default: contractJson }] = await Promise.all([
    import("@prisma/orm-postgres/runtime"),
    import("../../prisma/contract.json", { with: { type: "json" } }),
  ]);
  await import("temporal-polyfill/full/global");
  return postgres({ contractJson: contractJson as never, url: process.env.DATABASE_URL! }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe("live floor (integration)", { skip }, () => {
  const tag = Date.now().toString(36);
  const password = "Integration2026!";
  const created = { userIds: [] as string[], restaurantIds: [] as string[] };
  let owner = "";
  let customer = "";
  let restaurantId = "";
  let tableId = "";
  let timezone = "UTC";
  let firstId = "";
  let secondId = "";

  async function signUp(role: "owner" | "customer", name: string) {
    const res = await call("POST", "/api/auth/signup", null, {
      email: `it-${name}-${tag}@example.test`,
      password,
      firstName: "It",
      lastName: name,
      role,
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    created.userIds.push(res.json.user.id);
    return res.json.accessToken as string;
  }

  async function shift(id: string, startOffsetMin: number) {
    const db = await openDb();
    try {
      const start = Temporal.Now.instant().add({ minutes: startOffsetMin });
      await db.orm.public.Reservation.where({ id }).update({ startsAt: start, endsAt: start.add({ minutes: 90 }) });
    } finally {
      await db.close?.();
    }
  }

  const live = (token: string | null) => call("GET", `/api/restaurants/${restaurantId}/live`, token);
  const tableOf = (res: { json: Json }) => (res.json.live.tables as Json[]).find((table) => table.id === tableId) as Json;

  /** The alert notifications the owner holds, by key. */
  async function alertKeys() {
    const list = await call("GET", "/api/notifications", owner);
    assert.equal(list.status, 200, JSON.stringify(list.json));
    return (list.json.notifications as Json[]).map((note) => note.data?.alertKey).filter(Boolean) as string[];
  }

  const book = async (time: string) => {
    const day = Temporal.Now.instant().toZonedDateTimeISO(timezone).toPlainDate().add({ days: 10 }).toString();
    const res = await call("POST", "/api/reservations/checkout", customer, {
      reservation: { restaurantId, tableId, date: day, time, guestCount: 2 },
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    return res.json.reservation.id as string;
  };

  before(async () => {
    owner = await signUp("owner", "lowner");
    customer = await signUp("customer", "lcustomer");

    const hours = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, isClosed: false, openTime: "10:00", closeTime: "23:00" }));
    const made = await call("POST", "/api/restaurants", owner, {
      name: `IT Live Bistro ${tag}`,
      hours,
      floor: { name: "Main", width: 800, height: 600 },
    });
    assert.equal(made.status, 201, JSON.stringify(made.json));
    restaurantId = made.json.restaurant.id;
    created.restaurantIds.push(restaurantId);
    timezone = made.json.restaurant.timezone ?? timezone;

    tableId = `it-ltable-${tag}`;
    const floors = await call("GET", `/api/restaurants/${restaurantId}/floors`, owner);
    const floorId = floors.json.floors[0].id as string;
    const saved = await call("PUT", `/api/restaurants/${restaurantId}/floors/${floorId}/layout`, owner, {
      objects: [
        { id: tableId, type: "ROUND_TABLE", x: 2, y: 2, width: 0.9, height: 0.9, rotation: 0, zIndex: 1, locked: false, metadata: { capacity: 4, label: "L1" } },
      ],
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    const published = await call("PATCH", `/api/restaurants/${restaurantId}/status`, owner, { status: "ACTIVE" });
    assert.equal(published.status, 200, JSON.stringify(published.json));

    firstId = await book("19:00");
    secondId = await book("21:00");
  });

  after(async () => {
    const db = await openDb();
    try {
      for (const id of created.restaurantIds) {
        for (const row of await db.orm.public.Notification.where({ restaurantId: id }).all()) {
          await db.orm.public.Notification.where({ id: row.id }).delete();
        }
        for (const row of await db.orm.public.Order.where({ restaurantId: id }).all()) {
          await db.orm.public.Order.where({ id: row.id }).delete();
        }
        for (const row of await db.orm.public.Reservation.where({ restaurantId: id }).all()) {
          await db.orm.public.Reservation.where({ id: row.id }).delete();
        }
        for (const row of await db.orm.public.AuditLog.where({ restaurantId: id }).all()) {
          await db.orm.public.AuditLog.where({ id: row.id }).delete();
        }
        await db.orm.public.Restaurant.where({ id }).delete();
      }
      for (const id of created.userIds) {
        await db.orm.public.User.where({ id }).delete().catch(() => undefined);
      }
    } finally {
      await db.close?.();
    }
  });

  it("is reserved to the managers of the restaurant", async () => {
    assert.equal((await live(null)).status, 401);
    assert.equal((await live(customer)).status, 403);
    assert.equal((await live(owner)).status, 200);
  });

  it("shows a far booking as a free table with the booking as next", async () => {
    await shift(secondId, 300); // keep the second one out of the way
    await shift(firstId, 120);
    const table = tableOf(await live(owner));
    assert.equal(table.state, "FREE");
    assert.equal(table.next.id, firstId);
    assert.deepEqual(table.next.actions, []); // too early to seat
  });

  it("creates a single 'arriving' alert when several browsers read at once", async () => {
    await shift(firstId, 10);
    const calls = await Promise.all([live(owner), live(owner), live(owner), live(owner)]);
    for (const res of calls) assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(tableOf(calls[0]).state, "RESERVED_SOON");
    const keys = (await alertKeys()).filter((key) => key === `arriving:${firstId}`);
    assert.equal(keys.length, 1, "one alert, not one per request");

    await live(owner); // a later read adds nothing
    assert.equal((await alertKeys()).filter((key) => key === `arriving:${firstId}`).length, 1);
  });

  it("creates a single 'possible no-show' alert 15 minutes after the start", async () => {
    await shift(firstId, -16);
    await Promise.all([live(owner), live(owner), live(owner)]);
    const keys = await alertKeys();
    assert.equal(keys.filter((key) => key === `no_show_possible:${firstId}`).length, 1);
    assert.equal(keys.filter((key) => key === `arriving:${firstId}`).length, 1);
  });

  it("colors the table as occupied as soon as the reservation is seated", async () => {
    const seated = await call("PATCH", `/api/restaurants/${restaurantId}/reservations/${firstId}/status`, owner, { status: "SEATED" });
    assert.equal(seated.status, 200, JSON.stringify(seated.json));
    const table = tableOf(await live(owner));
    assert.equal(table.state, "OCCUPIED");
    assert.equal(table.current.id, firstId);
    assert.deepEqual(table.current.actions, ["COMPLETED"]);
  });

  it("creates a single 'table over time' alert when the next guests wait behind a seated party", async () => {
    await shift(firstId, -120); // seated, slot ended 30 minutes ago
    await shift(secondId, 5);
    const calls = await Promise.all([live(owner), live(owner), live(owner)]);
    const table = tableOf(calls[0]);
    assert.equal(table.state, "OVERDUE");
    assert.equal(table.next.id, secondId);
    assert.equal((await alertKeys()).filter((key) => key === `overrun:${firstId}`).length, 1);
  });
});

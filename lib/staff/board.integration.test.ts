/**
 * Staff service board, against a running dev server and its database.
 *
 *   npm run test:integration      (loads .env, server on RESTIVO_BASE_URL or :3000)
 *
 * Skipped when DATABASE_URL is absent, or when the server does not answer.
 * It creates its own throwaway users and restaurants and removes everything it
 * created (by exact id) when it finishes.
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

describe("staff service board (integration)", { skip }, () => {
  const tag = Date.now().toString(36);
  const password = "Integration2026!";
  const created = { userIds: [] as string[], restaurantIds: [] as string[] };
  const userIdOf: Record<string, string> = {};
  let owner = "";
  let customer = "";
  let staffA = "";
  let staffB = "";
  let staffSuspended = "";
  let restaurantA = "";
  let restaurantB = "";
  let tableA = "";
  let salad = "";
  let reservationId = "";
  let orderId = "";
  let timezone = "UTC";

  async function signUp(role: "owner" | "customer" | "staff", name: string) {
    const res = await call("POST", "/api/auth/signup", null, {
      email: `it-${name}-${tag}@example.test`,
      password,
      firstName: "It",
      lastName: name,
      role,
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    created.userIds.push(res.json.user.id);
    userIdOf[name] = res.json.user.id;
    return res.json.accessToken as string;
  }

  async function join(token: string, restaurantId: string) {
    const joined = await call("POST", "/api/staff/join", token, { restaurantId });
    assert.equal(joined.status, 201, JSON.stringify(joined.json));
    const accepted = await call("POST", `/api/restaurants/${restaurantId}/staff/requests/${joined.json.request.id}`, owner, {
      decision: "ACCEPT",
    });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
  }

  async function shiftReservation(id: string, startOffsetMin: number) {
    const db = await openDb();
    try {
      const start = Temporal.Now.instant().add({ minutes: startOffsetMin });
      await db.orm.public.Reservation.where({ id }).update({ startsAt: start, endsAt: start.add({ minutes: 90 }) });
    } finally {
      await db.close?.();
    }
  }

  const base = (restaurantId: string) => `/api/staff/restaurants/${restaurantId}`;

  before(async () => {
    owner = await signUp("owner", "sowner");
    customer = await signUp("customer", "scustomer");
    staffA = await signUp("staff", "sstaffa");
    staffB = await signUp("staff", "sstaffb");
    staffSuspended = await signUp("staff", "sstaffsusp");

    const hours = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, isClosed: false, openTime: "10:00", closeTime: "23:00" }));
    const make = async (name: string) => {
      const made = await call("POST", "/api/restaurants", owner, { name: `${name} ${tag}`, hours, floor: { name: "Main", width: 800, height: 600 } });
      assert.equal(made.status, 201, JSON.stringify(made.json));
      created.restaurantIds.push(made.json.restaurant.id);
      timezone = made.json.restaurant.timezone ?? timezone;
      return made.json.restaurant.id as string;
    };
    restaurantA = await make("IT Staff Bistro");
    restaurantB = await make("IT Staff Other");

    tableA = `it-stable-${tag}`;
    const floors = await call("GET", `/api/restaurants/${restaurantA}/floors`, owner);
    const floorId = floors.json.floors[0].id as string;
    const saved = await call("PUT", `/api/restaurants/${restaurantA}/floors/${floorId}/layout`, owner, {
      objects: [
        { id: tableA, type: "ROUND_TABLE", x: 2, y: 2, width: 0.9, height: 0.9, rotation: 0, zIndex: 1, locked: false, metadata: { capacity: 4, label: "S1" } },
      ],
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    const published = await call("PATCH", `/api/restaurants/${restaurantA}/status`, owner, { status: "ACTIVE" });
    assert.equal(published.status, 200, JSON.stringify(published.json));

    await call("POST", `/api/restaurants/${restaurantA}/menu`, owner, { name: "Main menu" });
    const category = await call("POST", `/api/restaurants/${restaurantA}/menu/categories`, owner, { name: "Plats" });
    const categoryId = (category.json.category?.id ?? category.json.menu?.categories?.at(-1)?.id) as string;
    const item = await call("POST", `/api/restaurants/${restaurantA}/menu/items`, owner, { categoryId, name: "Salade", price: "9.000" });
    assert.equal(item.status, 201, JSON.stringify(item.json));
    const all = (item.json.menu?.categories ?? []).flatMap((c: Json) => c.items) as Json[];
    salad = (item.json.item?.id ?? all.find((entry) => entry.name === "Salade")?.id) as string;
    const menuOn = await call("PATCH", `/api/restaurants/${restaurantA}/menu`, owner, { isPublished: true });
    assert.equal(menuOn.status, 200, JSON.stringify(menuOn.json));

    await join(staffA, restaurantA);
    await join(staffB, restaurantB);
    await join(staffSuspended, restaurantA);

    const day = Temporal.Now.instant().toZonedDateTimeISO(timezone).toPlainDate().add({ days: 10 }).toString();
    const booked = await call("POST", "/api/reservations/checkout", customer, {
      reservation: { restaurantId: restaurantA, tableId: tableA, date: day, time: "19:00", guestCount: 2 },
      order: { items: [{ menuItemId: salad, quantity: 2 }] },
    });
    assert.equal(booked.status, 201, JSON.stringify(booked.json));
    reservationId = booked.json.reservation.id;
    orderId = booked.json.order.id;
    // The guests are due now: the reservation starts 5 minutes ago.
    await shiftReservation(reservationId, -5);
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

  it("answers 401 without a token", async () => {
    assert.equal((await call("GET", `${base(restaurantA)}/reservations`, null)).status, 401);
    assert.equal((await call("GET", `${base(restaurantA)}/orders`, null)).status, 401);
    assert.equal((await call("PATCH", `${base(restaurantA)}/reservations/${reservationId}/status`, null, { status: "SEATED" })).status, 401);
  });

  it("answers 403 to anyone who is not an active staff member of that restaurant", async () => {
    // Staff of another restaurant, a customer, and the owner (who has the manager routes).
    for (const token of [staffB, customer, owner]) {
      assert.equal((await call("GET", `${base(restaurantA)}/reservations`, token)).status, 403);
      assert.equal((await call("GET", `${base(restaurantA)}/orders`, token)).status, 403);
      assert.equal((await call("PATCH", `${base(restaurantA)}/reservations/${reservationId}/status`, token, { status: "SEATED" })).status, 403);
      assert.equal((await call("PATCH", `${base(restaurantA)}/orders/${orderId}/status`, token, { status: "PREPARING" })).status, 403);
    }
    // An unknown restaurant looks the same.
    assert.equal((await call("GET", `${base("does-not-exist")}/reservations`, staffA)).status, 403);
  });

  it("answers 403 to a suspended account", async () => {
    const before = await call("GET", `${base(restaurantA)}/reservations`, staffSuspended);
    assert.equal(before.status, 200, JSON.stringify(before.json));
    const db = await openDb();
    try {
      await db.orm.public.User.where({ id: userIdOf["sstaffsusp"] }).update({ status: "SUSPENDED" });
    } finally {
      await db.close?.();
    }
    assert.equal((await call("GET", `${base(restaurantA)}/reservations`, staffSuspended)).status, 403);
    assert.equal((await call("GET", `${base(restaurantA)}/orders`, staffSuspended)).status, 403);
  });

  it("shows staff only their own restaurant, without any money", async () => {
    const mine = await call("GET", `${base(restaurantA)}/reservations`, staffA);
    assert.equal(mine.status, 200, JSON.stringify(mine.json));
    assert.deepEqual(mine.json.reservations.map((row: Json) => row.id), [reservationId]);
    assert.equal(mine.json.reservations[0].orderCount, 1);

    const other = await call("GET", `${base(restaurantB)}/reservations`, staffB);
    assert.equal(other.status, 200);
    assert.deepEqual(other.json.reservations, []);

    const text = JSON.stringify(mine.json);
    for (const word of ["total", "subtotal", "discount", "price", "currency", "ordersTotal"]) {
      assert.equal(text.toLowerCase().includes(word.toLowerCase()), false, `the staff payload must not contain "${word}"`);
    }
  });

  it("lets staff seat and complete, and nothing else", async () => {
    const path = `${base(restaurantA)}/reservations/${reservationId}/status`;
    for (const status of ["CANCELLED", "NO_SHOW", "CONFIRMED"]) {
      assert.equal((await call("PATCH", path, staffA, { status })).status, 403, status);
    }
    // Another restaurant's staff cannot reach it through their own restaurant either.
    assert.equal(
      (await call("PATCH", `${base(restaurantB)}/reservations/${reservationId}/status`, staffB, { status: "SEATED" })).status,
      404,
    );
    assert.equal((await call("PATCH", path, staffA, { status: "COMPLETED" })).status, 409); // not seated yet

    const seated = await call("PATCH", path, staffA, { status: "SEATED" });
    assert.equal(seated.status, 200, JSON.stringify(seated.json));
    assert.equal(seated.json.reservation.status, "SEATED");
    const listed = await call("GET", `${base(restaurantA)}/reservations`, staffA);
    assert.deepEqual(listed.json.reservations[0].actions, ["COMPLETED"]);
  });

  it("moves an order along the kitchen steps once a manager has confirmed it", async () => {
    // A pending order is not on the staff board yet.
    assert.deepEqual((await call("GET", `${base(restaurantA)}/orders`, staffA)).json.orders, []);
    const confirmed = await call("PATCH", `/api/restaurants/${restaurantA}/orders/${orderId}/status`, owner, { status: "CONFIRMED" });
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));

    const board = await call("GET", `${base(restaurantA)}/orders`, staffA);
    assert.equal(board.status, 200, JSON.stringify(board.json));
    assert.equal(board.json.orders.length, 1);
    assert.equal(board.json.orders[0].items[0].name, "Salade");
    assert.equal("total" in board.json.orders[0], false);
    assert.equal(JSON.stringify(board.json).includes("unitPrice"), false);

    const path = `${base(restaurantA)}/orders/${orderId}/status`;
    assert.equal((await call("PATCH", path, staffA, { status: "CANCELLED" })).status, 403);
    assert.equal((await call("PATCH", path, staffA, { status: "CONFIRMED" })).status, 403);
    assert.equal((await call("PATCH", path, staffA, { status: "READY" })).status, 409); // one step at a time
    for (const status of ["PREPARING", "READY", "DELIVERED"]) {
      const moved = await call("PATCH", path, staffA, { status });
      assert.equal(moved.status, 200, JSON.stringify(moved.json));
      assert.equal(moved.json.order.status, status);
    }
  });

  it("records who did what in the audit log", async () => {
    const db = await openDb();
    try {
      const rows = await db.orm.public.AuditLog.where({ restaurantId: restaurantA, userId: userIdOf["sstaffa"] }).all();
      const entities = rows.map((row: Json) => String(row.entityType));
      assert.ok(entities.includes("Reservation"), "the seat is audited");
      assert.ok(entities.includes("Order"), "the kitchen steps are audited");
    } finally {
      await db.close?.();
    }
  });
});

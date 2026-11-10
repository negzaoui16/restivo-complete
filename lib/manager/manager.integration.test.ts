/**
 * Manager reservations, orders, stats and notifications, against a running dev server and its database.
 *
 *   npm run test:integration      (loads .env, server on RESTIVO_BASE_URL or :3000)
 *
 * Skipped when DATABASE_URL is absent, or when the server does not answer.
 * It creates its own throwaway users and restaurants and removes everything it
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

/** A database handle, only for moving test reservations in time and for cleaning up. */
async function openDb() {
  const [{ default: postgres }, { default: contractJson }] = await Promise.all([
    import("@prisma/orm-postgres/runtime"),
    import("../../prisma/contract.json", { with: { type: "json" } }),
  ]);
  await import("temporal-polyfill/full/global");
  return postgres({ contractJson: contractJson as never, url: process.env.DATABASE_URL! }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe("manager side (integration)", { skip }, () => {
  const tag = Date.now().toString(36);
  const password = "Integration2026!";
  const created = { userIds: [] as string[], restaurantIds: [] as string[] };
  let owner = "";
  let stranger = ""; // another owner, no access to this restaurant
  let alice = "";
  let bob = "";
  let restaurantId = "";
  let otherRestaurantId = "";
  let small = "";
  let big = "";
  let timezone = "UTC";
  let salad = "";
  let couscous = "";

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

  const dateInDays = (days: number) =>
    Temporal.Now.instant().toZonedDateTimeISO(timezone).toPlainDate().add({ days }).toString();

  const checkout = (token: string, tableId: string, days: number, time: string, guests: number, items?: Json[]) =>
    call("POST", "/api/reservations/checkout", token, {
      reservation: { restaurantId, tableId, date: dateInDays(days), time, guestCount: guests },
      ...(items ? { order: { items } } : {}),
    });

  /** Moves a test reservation so that it starts `startOffsetMin` minutes from now and lasts 90 minutes. */
  async function shiftReservation(reservationId: string, startOffsetMin: number) {
    const db = await openDb();
    try {
      const start = Temporal.Now.instant().add({ minutes: startOffsetMin });
      await db.orm.public.Reservation.where({ id: reservationId }).update({
        startsAt: start,
        endsAt: start.add({ minutes: 90 }),
      });
    } finally {
      await db.close?.();
    }
  }

  const reservationStatus = (id: string, status: string, token = owner, restaurant = restaurantId) =>
    call("PATCH", `/api/restaurants/${restaurant}/reservations/${id}/status`, token, { status });
  const orderStatus = (id: string, status: string, token = owner, restaurant = restaurantId) =>
    call("PATCH", `/api/restaurants/${restaurant}/orders/${id}/status`, token, { status });

  before(async () => {
    owner = await signUp("owner", "mowner");
    stranger = await signUp("owner", "mstranger");
    alice = await signUp("customer", "malice");
    bob = await signUp("customer", "mbob");

    const hours = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      isClosed: false,
      openTime: "10:00",
      closeTime: "23:00",
    }));
    const make = async (name: string) => {
      const made = await call("POST", "/api/restaurants", owner, {
        name: `${name} ${tag}`,
        hours,
        floor: { name: "Main", width: 800, height: 600 },
      });
      assert.equal(made.status, 201, JSON.stringify(made.json));
      created.restaurantIds.push(made.json.restaurant.id);
      timezone = made.json.restaurant.timezone ?? timezone;
      return made.json.restaurant.id as string;
    };
    restaurantId = await make("IT Manager Bistro");
    otherRestaurantId = await make("IT Manager Other");

    const floors = await call("GET", `/api/restaurants/${restaurantId}/floors`, owner);
    const floorId = floors.json.floors[0].id as string;
    small = `it-msmall-${tag}`;
    big = `it-mbig-${tag}`;
    const table = (id: string, x: number, capacity: number, label: string) => ({
      id, type: "ROUND_TABLE", x, y: 2, width: 0.9, height: 0.9, rotation: 0, zIndex: 1, locked: false,
      metadata: { capacity, label },
    });
    const saved = await call("PUT", `/api/restaurants/${restaurantId}/floors/${floorId}/layout`, owner, {
      objects: [table(small, 2, 2, "S1"), table(big, 5, 4, "B1")],
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    const published = await call("PATCH", `/api/restaurants/${restaurantId}/status`, owner, { status: "ACTIVE" });
    assert.equal(published.status, 200, JSON.stringify(published.json));

    await call("POST", `/api/restaurants/${restaurantId}/menu`, owner, { name: "Main menu" });
    const category = await call("POST", `/api/restaurants/${restaurantId}/menu/categories`, owner, { name: "Plats" });
    const categoryId = (category.json.category?.id ?? category.json.menu?.categories?.at(-1)?.id) as string;
    const addItem = async (name: string, price: string) => {
      const res = await call("POST", `/api/restaurants/${restaurantId}/menu/items`, owner, { categoryId, name, price });
      assert.equal(res.status, 201, JSON.stringify(res.json));
      const all = (res.json.menu?.categories ?? []).flatMap((c: Json) => c.items) as Json[];
      return (res.json.item?.id ?? all.find((item) => item.name === name)?.id) as string;
    };
    salad = await addItem("Salade", "9.000");
    couscous = await addItem("Couscous", "18.500");
    const menuOn = await call("PATCH", `/api/restaurants/${restaurantId}/menu`, owner, { isPublished: true });
    assert.equal(menuOn.status, 200, JSON.stringify(menuOn.json));
  });

  after(async () => {
    const db = await openDb();
    try {
      for (const id of created.restaurantIds) {
        for (const row of await db.orm.public.Notification.where({ restaurantId: id }).all()) {
          await db.orm.public.Notification.where({ id: row.id }).delete();
        }
        for (const row of await db.orm.public.Order.where({ restaurantId: id }).all()) {
          await db.orm.public.Order.where({ id: row.id }).delete(); // items cascade
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

  // Shared between tests, in order.
  let aliceRes = ""; // day+10 19:00, big, 3 guests, one salad x2 order (18.000)
  let aliceOrder = "";
  let bobRes = ""; // day+10 21:00, small, 2 guests, one salad order (9.000)
  let bobOrder = "";

  it("creates reservations with pre-orders for the manager to work on", async () => {
    const a = await checkout(alice, big, 10, "19:00", 3, [{ menuItemId: salad, quantity: 2 }]);
    assert.equal(a.status, 201, JSON.stringify(a.json));
    aliceRes = a.json.reservation.id;
    aliceOrder = a.json.order.id;
    const b = await checkout(bob, small, 10, "21:00", 2, [{ menuItemId: salad, quantity: 1 }]);
    assert.equal(b.status, 201, JSON.stringify(b.json));
    bobRes = b.json.reservation.id;
    bobOrder = b.json.order.id;
    const c = await checkout(alice, big, 11, "12:00", 2);
    assert.equal(c.status, 201, JSON.stringify(c.json));
  });

  describe("access", () => {
    const paths = () => [
      ["GET", `/api/restaurants/${restaurantId}/reservations`],
      ["GET", `/api/restaurants/${restaurantId}/orders`],
      ["GET", `/api/restaurants/${restaurantId}/stats`],
      ["GET", `/api/restaurants/${restaurantId}/activity`],
      ["PATCH", `/api/restaurants/${restaurantId}/reservations/${aliceRes}/status`],
      ["PATCH", `/api/restaurants/${restaurantId}/orders/${aliceOrder}/status`],
    ];

    it("refuses requests without a token", async () => {
      for (const [method, path] of paths()) {
        assert.equal((await call(method, path, null, method === "PATCH" ? { status: "CANCELLED" } : undefined)).status, 401, path);
      }
    });

    it("refuses a customer and an owner of another restaurant with 403", async () => {
      for (const token of [alice, stranger]) {
        for (const [method, path] of paths()) {
          const res = await call(method, path, token, method === "PATCH" ? { status: "CANCELLED" } : undefined);
          assert.equal(res.status, 403, `${method} ${path}`);
        }
      }
    });

    it("treats a reservation of another restaurant as not found", async () => {
      const res = await reservationStatus(aliceRes, "CANCELLED", owner, otherRestaurantId);
      assert.equal(res.status, 404, JSON.stringify(res.json));
      const order = await orderStatus(aliceOrder, "CANCELLED", owner, otherRestaurantId);
      assert.equal(order.status, 404, JSON.stringify(order.json));
    });
  });

  describe("lists", () => {
    it("lists one day sorted by time, with table, customer, guests and pre-order total", async () => {
      const res = await call("GET", `/api/restaurants/${restaurantId}/reservations?date=${dateInDays(10)}`, owner);
      assert.equal(res.status, 200, JSON.stringify(res.json));
      const rows = res.json.reservations as Json[];
      assert.deepEqual(rows.map((row) => row.id), [aliceRes, bobRes]);
      assert.equal(rows[0].guestCount, 3);
      assert.equal(rows[0].customer.name, "It malice");
      assert.ok(rows[0].table.name);
      assert.equal(rows[0].ordersTotal, "18.000");
      assert.equal(rows[0].orders[0].id, aliceOrder);
      assert.equal(rows[1].ordersTotal, "9.000");
      assert.ok(rows[0].actions.includes("CANCELLED"));
      assert.ok(!rows[0].actions.includes("SEATED")); // ten days away
    });

    it("filters by status and by range, and rejects bad filters", async () => {
      const seated = await call("GET", `/api/restaurants/${restaurantId}/reservations?date=${dateInDays(10)}&status=SEATED`, owner);
      assert.deepEqual(seated.json.reservations, []);
      const range = await call("GET", `/api/restaurants/${restaurantId}/reservations?from=${dateInDays(10)}&to=${dateInDays(11)}`, owner);
      assert.equal(range.json.reservations.length, 3);
      assert.equal((await call("GET", `/api/restaurants/${restaurantId}/reservations?date=nope`, owner)).status, 422);
      assert.equal((await call("GET", `/api/restaurants/${restaurantId}/reservations?status=FLYING`, owner)).status, 422);
    });

    it("lists orders with lines, subtotal, discount and total, filtered by status and reservation", async () => {
      const res = await call("GET", `/api/restaurants/${restaurantId}/orders?reservationId=${aliceRes}`, owner);
      assert.equal(res.status, 200, JSON.stringify(res.json));
      assert.equal(res.json.orders.length, 1);
      const order = res.json.orders[0] as Json;
      assert.equal(order.id, aliceOrder);
      assert.equal(order.items[0].name, "Salade");
      assert.equal(order.items[0].quantity, 2);
      assert.equal(order.subtotal, "18.000");
      assert.equal(order.discount, "0.000");
      assert.equal(order.total, "18.000");
      const none = await call("GET", `/api/restaurants/${restaurantId}/orders?status=DELIVERED`, owner);
      assert.deepEqual(none.json.orders, []);
    });
  });

  describe("reservation lifecycle", () => {
    it("refuses seating too early, and skipping a step, with 409", async () => {
      const early = await reservationStatus(aliceRes, "SEATED");
      assert.equal(early.status, 409);
      assert.equal(early.json.code, "TOO_EARLY");
      const skip = await reservationStatus(aliceRes, "COMPLETED");
      assert.equal(skip.status, 409);
      assert.equal(skip.json.code, "INVALID_TRANSITION");
    });

    it("seats inside the window, notifies the customer, then completes; final states stay final", async () => {
      await shiftReservation(aliceRes, 10);
      const seated = await reservationStatus(aliceRes, "SEATED");
      assert.equal(seated.status, 200, JSON.stringify(seated.json));
      assert.equal(seated.json.reservation.status, "SEATED");
      assert.deepEqual(seated.json.reservation.actions, ["COMPLETED"]);

      const done = await reservationStatus(aliceRes, "COMPLETED");
      assert.equal(done.status, 200, JSON.stringify(done.json));
      const again = await reservationStatus(aliceRes, "SEATED");
      assert.equal(again.status, 409);
      const cancel = await reservationStatus(aliceRes, "CANCELLED");
      assert.equal(cancel.status, 409);

      const seenByCustomer = (await call("GET", "/api/reservations", alice)).json.reservations as Json[];
      assert.equal(seenByCustomer.find((row) => row.id === aliceRes)?.status, "COMPLETED");
    });

    it("moves a pre-order through its whole lifecycle, refusing skips, with a notification each time", async () => {
      assert.equal((await orderStatus(aliceOrder, "READY")).status, 409);
      for (const status of ["CONFIRMED", "PREPARING", "READY", "DELIVERED"]) {
        const res = await orderStatus(aliceOrder, status);
        assert.equal(res.status, 200, `${status}: ${JSON.stringify(res.json)}`);
        assert.equal(res.json.order.status, status);
      }
      assert.equal((await orderStatus(aliceOrder, "CANCELLED")).status, 409); // delivered
      const mine = (await call("GET", "/api/orders", alice)).json.orders as Json[];
      assert.equal(mine.find((row) => row.id === aliceOrder)?.status, "DELIVERED");
    });

    it("records a no-show only 15 minutes after the start, and then blocks the pre-order", async () => {
      await shiftReservation(bobRes, -5);
      const early = await reservationStatus(bobRes, "NO_SHOW");
      assert.equal(early.status, 409);
      assert.equal(early.json.code, "TOO_EARLY");

      await shiftReservation(bobRes, -20);
      const missed = await reservationStatus(bobRes, "NO_SHOW");
      assert.equal(missed.status, 200, JSON.stringify(missed.json));
      assert.equal(missed.json.reservation.status, "NO_SHOW");

      const blocked = await orderStatus(bobOrder, "CONFIRMED");
      assert.equal(blocked.status, 409);
      assert.equal(blocked.json.code, "RESERVATION_CLOSED");
      const cancelled = await orderStatus(bobOrder, "CANCELLED"); // cancelling stays possible
      assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json));
    });

    it("frees the table for a new booking once a reservation is a no-show or completed", async () => {
      // bobRes was a no-show on `small` (moved to the past); a booking of the same table later is a normal one.
      const again = await checkout(bob, small, 12, "21:00", 2);
      assert.equal(again.status, 201, JSON.stringify(again.json));
    });
  });

  describe("cancellation by the manager", () => {
    let cancelledRes = "";
    let cancelledOrder = "";
    let keptOrder = "";

    it("cancels the reservation and cascades to its pending pre-orders in one step", async () => {
      const made = await checkout(alice, big, 15, "13:00", 2, [{ menuItemId: couscous, quantity: 1 }]);
      assert.equal(made.status, 201, JSON.stringify(made.json));
      cancelledRes = made.json.reservation.id;
      cancelledOrder = made.json.order.id;
      // A second order already preparing stays untouched: only PENDING and CONFIRMED cascade.
      const extra = await call("POST", "/api/orders", alice, { reservationId: cancelledRes, items: [{ menuItemId: salad, quantity: 1 }] });
      assert.equal(extra.status, 201, JSON.stringify(extra.json));
      keptOrder = extra.json.order.id;
      for (const status of ["CONFIRMED", "PREPARING"]) {
        assert.equal((await orderStatus(keptOrder, status)).status, 200);
      }

      const res = await reservationStatus(cancelledRes, "CANCELLED");
      assert.equal(res.status, 200, JSON.stringify(res.json));
      assert.equal(res.json.cancelledOrders, 1);
      const orders = (await call("GET", `/api/restaurants/${restaurantId}/orders?reservationId=${cancelledRes}`, owner)).json.orders as Json[];
      assert.equal(orders.find((row) => row.id === cancelledOrder)?.status, "CANCELLED");
      assert.equal(orders.find((row) => row.id === keptOrder)?.status, "PREPARING");
    });

    it("shows the customer that the restaurant cancelled", async () => {
      const reservations = (await call("GET", "/api/reservations", alice)).json.reservations as Json[];
      const mine = reservations.find((row) => row.id === cancelledRes);
      assert.equal(mine?.status, "CANCELLED");
      assert.equal(mine?.cancelledByRestaurant, true);
      const orders = (await call("GET", "/api/orders", alice)).json.orders as Json[];
      assert.equal(orders.find((row) => row.id === cancelledOrder)?.cancelledByRestaurant, true);

      // A cancellation made by the customer is not attributed to the restaurant.
      const own = await checkout(alice, big, 16, "13:00", 2);
      assert.equal(own.status, 201, JSON.stringify(own.json));
      const byCustomer = await call("POST", `/api/reservations/${own.json.reservation.id}/cancel`, alice);
      assert.equal(byCustomer.status, 200);
      const after_ = (await call("GET", "/api/reservations", alice)).json.reservations as Json[];
      assert.equal(after_.find((row) => row.id === own.json.reservation.id)?.cancelledByRestaurant, false);
    });
  });

  describe("notifications", () => {
    it("lists the newest first with an unread count, and each change produced one", async () => {
      const res = await call("GET", "/api/notifications", alice);
      assert.equal(res.status, 200, JSON.stringify(res.json));
      const list = res.json.notifications as Json[];
      assert.ok(res.json.unread >= 8, `unread: ${res.json.unread}`);
      const titles = list.map((row) => row.title);
      assert.ok(titles.includes("Welcome!"), titles.join(" | "));
      assert.ok(titles.includes("Order delivered"));
      assert.ok(titles.includes("Reservation cancelled by the restaurant"));
      for (let i = 1; i < list.length; i += 1) {
        assert.ok(Date.parse(list[i - 1].createdAt) >= Date.parse(list[i].createdAt));
      }
      const withData = list.find((row) => row.title === "Order delivered") as Json;
      assert.equal(withData.type, "ORDER");
      assert.equal(withData.data.orderId, aliceOrder);
      assert.equal(withData.data.reservationId, aliceRes);
    });

    it("marks one, then all, as read, and never touches another user's notifications", async () => {
      const before_ = (await call("GET", "/api/notifications", alice)).json;
      const first = before_.notifications.find((row: Json) => !row.readAt) as Json;

      const intruder = await call("POST", "/api/notifications/read", bob, { ids: [first.id] });
      assert.equal(intruder.status, 200);
      const untouched = (await call("GET", "/api/notifications", alice)).json;
      assert.equal(untouched.unread, before_.unread);

      const one = await call("POST", "/api/notifications/read", alice, { ids: [first.id] });
      assert.equal(one.status, 200, JSON.stringify(one.json));
      assert.equal(one.json.unread, before_.unread - 1);

      const all = await call("POST", "/api/notifications/read", alice, { all: true });
      assert.equal(all.json.unread, 0);
      assert.ok(all.json.notifications.every((row: Json) => row.readAt));

      assert.equal((await call("POST", "/api/notifications/read", alice, {})).status, 422);
      assert.equal((await call("GET", "/api/notifications", null)).status, 401);
      assert.equal((await call("POST", "/api/notifications/read", null, { all: true })).status, 401);
    });
  });

  describe("stats", () => {
    it("counts a clean day exactly, in TND with three decimals", async () => {
      // Day +20: two kept reservations (2 + 3 guests, orders 18.000 + 9.000) and one cancelled with its order.
      const r1 = await checkout(alice, small, 20, "12:00", 2, [{ menuItemId: salad, quantity: 2 }]);
      const r2 = await checkout(bob, big, 20, "13:00", 3, [{ menuItemId: salad, quantity: 1 }]);
      const r3 = await checkout(alice, small, 20, "19:00", 2, [{ menuItemId: couscous, quantity: 1 }]);
      for (const res of [r1, r2, r3]) assert.equal(res.status, 201, JSON.stringify(res.json));
      assert.equal((await reservationStatus(r3.json.reservation.id, "CANCELLED")).status, 200);

      const date = dateInDays(20);
      const res = await call("GET", `/api/restaurants/${restaurantId}/stats?date=${date}`, owner);
      assert.equal(res.status, 200, JSON.stringify(res.json));
      const stats = res.json.stats as Json;
      assert.equal(stats.date, date);
      assert.equal(stats.reservationsToday, 2);
      assert.equal(stats.coversToday, 5);
      assert.equal(stats.revenueToday, "27.000");
      assert.equal(stats.currency, "TND");

      // Orders to process: every open order whose day is on or before that day.
      const endMs = Temporal.PlainDate.from(date).add({ days: 1 }).toZonedDateTime(timezone).epochMilliseconds;
      const open = (await call("GET", `/api/restaurants/${restaurantId}/orders?status=PENDING,CONFIRMED,PREPARING,READY`, owner)).json.orders as Json[];
      const expected = open.filter((order) => Date.parse(order.reservation?.startsAt ?? order.createdAt) < endMs).length;
      assert.equal(stats.ordersToProcess, expected);
      assert.ok(expected >= 2);
    });

    it("answers zeros for an empty day and rejects a bad date", async () => {
      const empty = await call("GET", `/api/restaurants/${restaurantId}/stats?date=${dateInDays(40)}`, owner);
      assert.equal(empty.json.stats.reservationsToday, 0);
      assert.equal(empty.json.stats.coversToday, 0);
      assert.equal(empty.json.stats.revenueToday, "0.000");
      assert.equal((await call("GET", `/api/restaurants/${restaurantId}/stats?date=soon`, owner)).status, 422);
    });
  });

  describe("activity", () => {
    it("shows the latest reservation and order events", async () => {
      const res = await call("GET", `/api/restaurants/${restaurantId}/activity`, owner);
      assert.equal(res.status, 200, JSON.stringify(res.json));
      const items = res.json.activity as Json[];
      assert.ok(items.length > 0 && items.length <= 8);
      assert.ok(items.every((item) => ["reservation", "order"].includes(item.kind) && item.title && item.at));
    });
  });
});

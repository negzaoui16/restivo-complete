/**
 * End-to-end booking checks against a running dev server and its database.
 *
 *   npm run test:integration      (loads .env, server on RESTIVO_BASE_URL or :3000)
 *
 * Skipped when DATABASE_URL is absent, or when the server does not answer.
 * It signs up its own throwaway users and restaurant, and removes everything
 * it created (by exact id) when it finishes.
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

/** The menu endpoints answer with the created row or the whole menu tree; accept both. */
function lastCategoryId(json: Json): string {
  return (json.category?.id ?? json.menu?.categories?.at(-1)?.id) as string;
}

function itemIdByName(json: Json, name: string): string {
  const all = (json.menu?.categories ?? []).flatMap((c: Json) => c.items) as Json[];
  return (json.item?.id ?? all.find((item) => item.name === name)?.id) as string;
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
const skip = !HAS_DB
  ? "DATABASE_URL is not set"
  : !up
    ? `no server answering at ${BASE}`
    : false;

describe("reservations (integration)", { skip }, () => {
  const tag = Date.now().toString(36);
  const password = "Integration2026!";
  const created = { userIds: [] as string[], restaurantIds: [] as string[], reservationIds: [] as string[] };
  let owner = "";
  let alice = "";
  let bob = "";
  let restaurantId = "";
  let small = ""; // 2 seats
  let big = ""; // 4 seats
  let timezone = "UTC";
  let winner: { id: string; token: string } | null = null; // holds small @ 20:00
  let couscous = "";
  let salad = "";
  let soldOut = "";
  let foreignDish = "";

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

  /** A restaurant-local date `days` from now. */
  function dateInDays(days: number) {
    return Temporal.Now.instant().toZonedDateTimeISO(timezone).toPlainDate().add({ days }).toString();
  }

  const book = (token: string, tableId: string, extra: Json = {}) =>
    call("POST", "/api/reservations", token, {
      restaurantId,
      tableId,
      date: dateInDays(10),
      time: "19:00",
      guestCount: 2,
      ...extra,
    });

  before(async () => {
    owner = await signUp("owner", "owner");
    alice = await signUp("customer", "alice");
    bob = await signUp("customer", "bob");

    const hours = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      isClosed: false,
      openTime: "10:00",
      closeTime: "23:00",
    }));
    const made = await call("POST", "/api/restaurants", owner, {
      name: `IT Bistro ${tag}`,
      hours,
      floor: { name: "Main", width: 800, height: 600 },
    });
    assert.equal(made.status, 201, JSON.stringify(made.json));
    restaurantId = made.json.restaurant.id;
    created.restaurantIds.push(restaurantId);
    timezone = made.json.restaurant.timezone ?? "UTC";

    const floors = await call("GET", `/api/restaurants/${restaurantId}/floors`, owner);
    const floorId = floors.json.floors[0].id as string;
    small = `it-small-${tag}`;
    big = `it-big-${tag}`;
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

    // Menu: Couscous 18.500 (two live promotions), Salade 9.000, one unavailable dish.
    const menu = await call("POST", `/api/restaurants/${restaurantId}/menu`, owner, { name: "Main menu" });
    assert.equal(menu.status, 201, JSON.stringify(menu.json));
    const category = await call("POST", `/api/restaurants/${restaurantId}/menu/categories`, owner, { name: "Plats" });
    assert.equal(category.status, 201, JSON.stringify(category.json));
    const categoryId = lastCategoryId(category.json);
    const addItem = async (name: string, price: number, isAvailable = true) => {
      const res = await call("POST", `/api/restaurants/${restaurantId}/menu/items`, owner, { categoryId, name, price, isAvailable });
      assert.equal(res.status, 201, JSON.stringify(res.json));
      return itemIdByName(res.json, name);
    };
    couscous = await addItem("Couscous", 18.5);
    salad = await addItem("Salade", 9);
    soldOut = await addItem("Plat epuise", 12, false);
    const day = 86_400_000;
    const window = { startsAt: new Date(Date.now() - day).toISOString(), endsAt: new Date(Date.now() + 30 * day).toISOString() };
    for (const promotion of [
      { name: "Dix pour cent", type: "PERCENTAGE", value: 10 },
      { name: "Un dinar", type: "FIXED_AMOUNT", value: 1 },
    ]) {
      const res = await call("POST", `/api/restaurants/${restaurantId}/promotions`, owner, { ...promotion, ...window, menuItemIds: [couscous] });
      assert.equal(res.status, 201, JSON.stringify(res.json));
    }
    const publishedMenu = await call("PATCH", `/api/restaurants/${restaurantId}/menu`, owner, { isPublished: true });
    assert.equal(publishedMenu.status, 200, JSON.stringify(publishedMenu.json));

    // A second restaurant with its own dish, to prove dishes cannot cross restaurants.
    const other = await call("POST", "/api/restaurants", owner, { name: `IT Other ${tag}`, hours, floor: { name: "Main", width: 800, height: 600 } });
    assert.equal(other.status, 201, JSON.stringify(other.json));
    const otherId = other.json.restaurant.id as string;
    created.restaurantIds.push(otherId);
    await call("POST", `/api/restaurants/${otherId}/menu`, owner, { name: "Other menu" });
    const otherCategory = await call("POST", `/api/restaurants/${otherId}/menu/categories`, owner, { name: "Autres" });
    const otherItem = await call("POST", `/api/restaurants/${otherId}/menu/items`, owner, {
      categoryId: lastCategoryId(otherCategory.json),
      name: "Plat voisin",
      price: 5,
    });
    assert.equal(otherItem.status, 201, JSON.stringify(otherItem.json));
    foreignDish = itemIdByName(otherItem.json, "Plat voisin");
  });

  after(async () => {
    const [{ default: postgres }, { default: contractJson }] = await Promise.all([
      import("@prisma/orm-postgres/runtime"),
      import("../../prisma/contract.json", { with: { type: "json" } }),
    ]);
    await import("temporal-polyfill/full/global");
    const db = postgres({ contractJson: contractJson as never, url: process.env.DATABASE_URL! }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      for (const id of created.restaurantIds) {
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

  it("books a free table as CONFIRMED and returns a code", async () => {
    const res = await book(alice, big, { guestCount: 3, time: "12:00" });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    created.reservationIds.push(res.json.reservation.id);
    assert.equal(res.json.reservation.status, "CONFIRMED");
    assert.match(res.json.reservation.code, /^RST-[A-Z0-9]{6}$/);
  });

  it("lets only one of two simultaneous bookings of the same table and slot through", async () => {
    const [a, b] = await Promise.all([book(alice, small, { time: "20:00" }), book(bob, small, { time: "20:00" })]);
    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [201, 409], JSON.stringify([a.json, b.json]));
    const loser = a.status === 409 ? a : b;
    assert.equal(loser.json.code, "SLOT_TAKEN");
    for (const r of [a, b]) if (r.status === 201) created.reservationIds.push(r.json.reservation.id);
    winner = a.status === 201 ? { id: a.json.reservation.id, token: alice } : { id: b.json.reservation.id, token: bob };
  });

  it("holds up under a burst of simultaneous bookings", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => book(i % 2 ? alice : bob, small, { time: "14:00" })),
    );
    const ok = results.filter((r) => r.status === 201);
    assert.equal(ok.length, 1, results.map((r) => r.status).join());
    for (const r of ok) created.reservationIds.push(r.json.reservation.id);
  });

  it("refuses a table that is too small", async () => {
    const res = await book(alice, small, { guestCount: 3, time: "16:00" });
    assert.equal(res.status, 422);
    assert.equal(res.json.code, "TABLE_TOO_SMALL");
  });

  it("refuses a slot outside opening hours", async () => {
    const res = await book(alice, big, { time: "22:00" }); // 22:00 + 90 min runs past 23:00
    assert.equal(res.status, 422);
    assert.equal(res.json.code, "OUTSIDE_HOURS");
  });

  it("refuses the past and slots less than 30 minutes away", async () => {
    const past = await book(alice, big, { date: dateInDays(-1) });
    assert.equal(past.status, 422);
    assert.equal(past.json.code, "TOO_SOON");

    const soon = Temporal.Now.instant().add({ minutes: 10 }).toZonedDateTimeISO(timezone);
    const imminent = await book(alice, big, {
      date: soon.toPlainDate().toString(),
      time: soon.toPlainTime().toString({ smallestUnit: "minute" }),
    });
    assert.equal(imminent.status, 422);
    assert.equal(imminent.json.code, "TOO_SOON");
  });

  it("refuses a date more than 60 days ahead", async () => {
    const res = await book(alice, big, { date: dateInDays(61) });
    assert.equal(res.status, 422);
    assert.equal(res.json.code, "TOO_FAR");
  });

  it("reports availability, and cancelling frees the table", async () => {
    const query = `date=${dateInDays(10)}&time=20:00&guests=2`;
    const before = await call("GET", `/api/discover/restaurants/${restaurantId}/availability?${query}`, bob);
    assert.equal(before.json.availability.tables.find((t: Json) => t.tableId === small).state, "taken");

    assert.ok(winner, "the concurrency test must have produced a winner");
    const { id, token } = winner;

    const cancelled = await call("POST", `/api/reservations/${id}/cancel`, token);
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json));
    assert.equal(cancelled.json.reservation.status, "CANCELLED");

    const after_ = await call("GET", `/api/discover/restaurants/${restaurantId}/availability?${query}`, bob);
    assert.equal(after_.json.availability.tables.find((t: Json) => t.tableId === small).state, "free");

    const again = await book(token === alice ? bob : alice, small, { time: "20:00" });
    assert.equal(again.status, 201, JSON.stringify(again.json));
    created.reservationIds.push(again.json.reservation.id);
  });

  it("denies access to another customer's reservation", async () => {
    const res = await book(alice, big, { time: "18:00", date: dateInDays(11) });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    created.reservationIds.push(res.json.reservation.id);

    const intruder = await call("POST", `/api/reservations/${res.json.reservation.id}/cancel`, bob);
    assert.equal(intruder.status, 403);

    const bobsList = await call("GET", "/api/reservations", bob);
    assert.ok(!bobsList.json.reservations.some((r: Json) => r.id === res.json.reservation.id));
  });

  it("requires a signed-in account", async () => {
    assert.equal((await call("GET", "/api/reservations", null)).status, 401);
    assert.equal((await call("POST", "/api/reservations", null, {})).status, 401);
  });

  describe("pre-orders", () => {
    let reservationId = "";
    const order = (token: string, items: Json[], extra: Json = {}) =>
      call("POST", "/api/orders", token, { reservationId, items, ...extra });

    before(async () => {
      const res = await book(alice, big, { date: dateInDays(12), time: "19:00", guestCount: 3 });
      assert.equal(res.status, 201, JSON.stringify(res.json));
      reservationId = res.json.reservation.id;
      created.reservationIds.push(reservationId);
    });

    it("lists the published menu with the best promotion applied", async () => {
      const res = await call("GET", `/api/discover/restaurants/${restaurantId}/menu`, alice);
      assert.equal(res.status, 200, JSON.stringify(res.json));
      assert.equal(res.json.currency, "TND");
      assert.equal(res.json.decimals, 3);
      const item = res.json.menu.categories.flatMap((c: Json) => c.items).find((i: Json) => i.id === couscous);
      assert.equal(item.price, "18.500");
      assert.equal(item.salePrice, "16.650"); // 10% (1.850) beats 1.000 off, and they do not stack
      assert.match(item.promotionLabel, /10% off/);
    });

    it("prices on the server and ignores any price the client sends", async () => {
      const res = await order(
        alice,
        [
          { menuItemId: couscous, quantity: 2, price: "0.001", unitPrice: 0.001, total: 0 },
          { menuItemId: salad, quantity: 1, price: 0 },
        ],
        { subtotal: "0.000", discount: "999.000", total: "0.001" },
      );
      assert.equal(res.status, 201, JSON.stringify(res.json));
      const placed = res.json.order;
      assert.equal(placed.currency, "TND");
      assert.equal(placed.subtotal, "46.000"); // 2 x 18.500 + 9.000
      assert.equal(placed.discount, "3.700"); // 2 x 1.850, the best promotion only
      assert.equal(placed.total, "42.300");
      assert.equal(placed.status, "PENDING");
      const lines = Object.fromEntries(placed.items.map((i: Json) => [i.name, i.unitPrice]));
      assert.deepEqual(lines, { Couscous: "18.500", Salade: "9.000" });
    });

    it("allows several pre-orders on one reservation", async () => {
      const second = await order(alice, [{ menuItemId: salad, quantity: 2 }]);
      assert.equal(second.status, 201, JSON.stringify(second.json));
      assert.equal(second.json.order.total, "18.000");
      const mine = await call("GET", `/api/orders?reservationId=${reservationId}`, alice);
      assert.equal(mine.json.orders.length, 2);
    });

    it("refuses a dish from another restaurant", async () => {
      const res = await order(alice, [{ menuItemId: foreignDish, quantity: 1 }]);
      assert.equal(res.status, 422);
      assert.equal(res.json.code, "ITEM_NOT_FOUND");
    });

    it("refuses an unavailable dish", async () => {
      const res = await order(alice, [{ menuItemId: soldOut, quantity: 1 }]);
      assert.equal(res.status, 409);
      assert.equal(res.json.code, "ITEM_UNAVAILABLE");
    });

    it("validates quantities and requires at least one dish", async () => {
      assert.equal((await order(alice, [{ menuItemId: salad, quantity: 0 }])).status, 422);
      assert.equal((await order(alice, [{ menuItemId: salad, quantity: 1.5 }])).status, 422);
      assert.equal((await order(alice, [])).status, 422);
    });

    it("denies ordering on another customer reservation", async () => {
      const res = await order(bob, [{ menuItemId: salad, quantity: 1 }]);
      assert.equal(res.status, 403);
      const theirs = await call("GET", "/api/orders", bob);
      assert.equal(theirs.json.orders.length, 0);
    });

    it("cancelling the reservation cancels its pending pre-orders together", async () => {
      const res = await call("POST", `/api/reservations/${reservationId}/cancel`, alice);
      assert.equal(res.status, 200, JSON.stringify(res.json));
      assert.equal(res.json.cancelledOrders, 2);
      const mine = await call("GET", `/api/orders?reservationId=${reservationId}`, alice);
      assert.deepEqual(mine.json.orders.map((o: Json) => o.status), ["CANCELLED", "CANCELLED"]);
    });

    it("refuses new pre-orders once the reservation is cancelled", async () => {
      const res = await order(alice, [{ menuItemId: salad, quantity: 1 }]);
      assert.equal(res.status, 409);
      assert.equal(res.json.code, "RESERVATION_NOT_ORDERABLE");
    });

    it("requires a signed-in account", async () => {
      assert.equal((await call("GET", "/api/orders", null)).status, 401);
      assert.equal((await call("POST", "/api/orders", null, {})).status, 401);
    });
  });

  describe("checkout (reservation + pre-order in one call)", () => {
    const slot = (days: number, time: string, extra: Json = {}) => ({
      restaurantId,
      tableId: big,
      date: dateInDays(days),
      time,
      guestCount: 2,
      ...extra,
    });
    const checkout = (token: string | null, reservation: Json, order?: Json) =>
      call("POST", "/api/reservations/checkout", token, { reservation, ...(order ? { order } : {}) });
    const counts = async (token: string) => ({
      reservations: ((await call("GET", "/api/reservations", token)).json.reservations as Json[]).length,
      orders: ((await call("GET", "/api/orders", token)).json.orders as Json[]).length,
    });

    it("creates the reservation and the order together, priced on the server", async () => {
      const res = await checkout(alice, slot(20, "19:00"), {
        notes: "No onions",
        items: [
          { menuItemId: couscous, quantity: 2, price: "0.001", unitPrice: 0.001 },
          { menuItemId: salad, quantity: 1 },
        ],
      });
      assert.equal(res.status, 201, JSON.stringify(res.json));
      created.reservationIds.push(res.json.reservation.id);
      assert.equal(res.json.reservation.status, "CONFIRMED");
      assert.match(res.json.reservation.code, /^RST-[A-Z0-9]{6}$/);
      assert.equal(res.json.order.status, "PENDING");
      assert.equal(res.json.order.subtotal, "46.000");
      assert.equal(res.json.order.discount, "3.700");
      assert.equal(res.json.order.total, "42.300");
      assert.equal(res.json.order.reservation.id, res.json.reservation.id);
    });

    it("books without an order when none is sent", async () => {
      const before = await counts(alice);
      const res = await checkout(alice, slot(21, "19:00"));
      assert.equal(res.status, 201, JSON.stringify(res.json));
      created.reservationIds.push(res.json.reservation.id);
      assert.equal(res.json.order, null);
      assert.deepEqual(await counts(alice), { reservations: before.reservations + 1, orders: before.orders });
    });

    it("saves nothing when the table is taken", async () => {
      const first = await checkout(bob, slot(22, "19:00"));
      assert.equal(first.status, 201, JSON.stringify(first.json));
      created.reservationIds.push(first.json.reservation.id);

      const before = await counts(alice);
      const res = await checkout(alice, slot(22, "19:00"), { items: [{ menuItemId: salad, quantity: 1 }] });
      assert.equal(res.status, 409);
      assert.equal(res.json.code, "SLOT_TAKEN");
      assert.deepEqual(await counts(alice), before);
    });

    it("saves nothing when a dish is unavailable or foreign", async () => {
      const before = await counts(alice);
      const sold = await checkout(alice, slot(23, "19:00"), { items: [{ menuItemId: soldOut, quantity: 1 }] });
      assert.equal(sold.status, 409);
      assert.equal(sold.json.code, "ITEM_UNAVAILABLE");
      const foreign = await checkout(alice, slot(23, "19:00"), { items: [{ menuItemId: foreignDish, quantity: 1 }] });
      assert.equal(foreign.status, 422);
      assert.equal(foreign.json.code, "ITEM_NOT_FOUND");
      assert.deepEqual(await counts(alice), before);
      // The table is still free for that slot.
      const retry = await checkout(alice, slot(23, "19:00"), { items: [{ menuItemId: salad, quantity: 1 }] });
      assert.equal(retry.status, 201, JSON.stringify(retry.json));
      created.reservationIds.push(retry.json.reservation.id);
    });

    it("keeps the booking rules (capacity, hours, lead time)", async () => {
      const items = [{ menuItemId: salad, quantity: 1 }];
      assert.equal((await checkout(alice, slot(24, "19:00", { tableId: small, guestCount: 3 }), { items })).json.code, "TABLE_TOO_SMALL");
      assert.equal((await checkout(alice, slot(24, "22:00"), { items })).json.code, "OUTSIDE_HOURS");
      assert.equal((await checkout(alice, slot(90, "19:00"), { items })).json.code, "TOO_FAR");
    });

    it("lets only one of two simultaneous checkouts through, with one order", async () => {
      const body = { items: [{ menuItemId: salad, quantity: 1 }] };
      const beforeAlice = await counts(alice);
      const beforeBob = await counts(bob);
      const [a, b] = await Promise.all([
        checkout(alice, slot(25, "19:00"), body),
        checkout(bob, slot(25, "19:00"), body),
      ]);
      assert.deepEqual([a.status, b.status].sort(), [201, 409], JSON.stringify([a.json, b.json]));
      for (const r of [a, b]) if (r.status === 201) created.reservationIds.push(r.json.reservation.id);
      const afterAlice = await counts(alice);
      const afterBob = await counts(bob);
      assert.equal(afterAlice.orders - beforeAlice.orders + (afterBob.orders - beforeBob.orders), 1);
      assert.equal(afterAlice.reservations - beforeAlice.reservations + (afterBob.reservations - beforeBob.reservations), 1);
    });

    it("validates the body and requires a signed-in account", async () => {
      assert.equal((await checkout(alice, slot(26, "19:00"), { items: [] })).status, 422);
      assert.equal((await checkout(alice, slot(26, "19:00"), { items: [{ menuItemId: salad, quantity: 0 }] })).status, 422);
      assert.equal((await checkout(null, slot(26, "19:00"))).status, 401);
    });

    it("adds a pre-order to a reservation made without one, and lists it with its reservation", async () => {
      const booked = await checkout(alice, slot(27, "19:00"));
      assert.equal(booked.status, 201, JSON.stringify(booked.json));
      const reservationId = booked.json.reservation.id as string;
      created.reservationIds.push(reservationId);

      const placed = await call("POST", "/api/orders", alice, {
        reservationId,
        items: [{ menuItemId: couscous, quantity: 1, price: "0.001" }],
      });
      assert.equal(placed.status, 201, JSON.stringify(placed.json));
      assert.equal(placed.json.order.total, "16.650");
      assert.equal(placed.json.order.reservation.id, reservationId);

      const orders = await call("GET", `/api/orders?reservationId=${reservationId}`, alice);
      assert.equal(orders.json.orders.length, 1);
      assert.equal(orders.json.orders[0].reservation.code, booked.json.reservation.code);
      // Another customer cannot pre-order on it.
      const foreign = await call("POST", "/api/orders", bob, { reservationId, items: [{ menuItemId: salad, quantity: 1 }] });
      assert.equal(foreign.status, 403);
    });

    it("lists a reservation created with its order in both Reservations and Orders", async () => {
      const res = await checkout(alice, slot(28, "19:00"), { items: [{ menuItemId: salad, quantity: 2 }] });
      assert.equal(res.status, 201, JSON.stringify(res.json));
      created.reservationIds.push(res.json.reservation.id);
      const reservations = (await call("GET", "/api/reservations", alice)).json.reservations as Json[];
      assert.ok(reservations.some((r) => r.id === res.json.reservation.id && r.status === "CONFIRMED"));
      const orders = (await call("GET", "/api/orders", alice)).json.orders as Json[];
      const mine = orders.find((o) => o.id === res.json.order.id);
      assert.ok(mine);
      assert.equal(mine.reservation.id, res.json.reservation.id);
      assert.equal(mine.total, "18.000");
    });

    it("exposes the featured flag on the customer menu", async () => {
      const res = await call("GET", `/api/discover/restaurants/${restaurantId}/menu`, alice);
      const item = res.json.menu.categories.flatMap((c: Json) => c.items)[0];
      assert.equal(typeof item.isFeatured, "boolean");
    });
  });
});

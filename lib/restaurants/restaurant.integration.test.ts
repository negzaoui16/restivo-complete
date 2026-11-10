/**
 * Restaurant profile, opening hours (including after midnight), floors, team, reviews,
 * favorites and reservation changes, against a running dev server and its database.
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

/** A database handle, only to read audit entries and to clean up. */
async function openDb() {
  const [{ default: postgres }, { default: contractJson }] = await Promise.all([
    import("@prisma/orm-postgres/runtime"),
    import("../../prisma/contract.json", { with: { type: "json" } }),
  ]);
  await import("temporal-polyfill/full/global");
  return postgres({ contractJson: contractJson as never, url: process.env.DATABASE_URL! }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe("restaurant management (integration)", { skip }, () => {
  const tag = Date.now().toString(36);
  const password = "Integration2026!";
  const created = { userIds: [] as string[], restaurantIds: [] as string[] };
  let owner = "";
  let ownerId = "";
  let stranger = "";
  let customer = "";
  let restaurantId = "";
  let slug = "";
  let table = "";
  let spareTable = "";
  const timezone = "Africa/Tunis";

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
    return { token: res.json.accessToken as string, id: res.json.user.id as string };
  }

  /** The next given weekday (0 = Sunday) at least `minDays` ahead, in the restaurant time zone. */
  function nextWeekday(dayOfWeek: number, minDays = 3) {
    let date = Temporal.Now.instant().toZonedDateTimeISO(timezone).toPlainDate().add({ days: minDays });
    while (date.dayOfWeek % 7 !== dayOfWeek) date = date.add({ days: 1 });
    return date;
  }

  const normalHours = (overrides: Json = {}) =>
    [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      isClosed: false,
      openTime: "10:00",
      closeTime: "23:00",
      ...(overrides[dayOfWeek] ?? {}),
    }));

  const book = (token: string, date: string, time: string, extra: Json = {}) =>
    call("POST", "/api/reservations", token, { restaurantId, tableId: table, date, time, guestCount: 2, ...extra });

  before(async () => {
    const ownerAccount = await signUp("owner", "rowner");
    owner = ownerAccount.token;
    ownerId = ownerAccount.id;
    stranger = (await signUp("owner", "rstranger")).token;
    customer = (await signUp("customer", "rcustomer")).token;

    const made = await call("POST", "/api/restaurants", owner, {
      name: `IT Profile ${tag}`,
      hours: normalHours(),
      floor: { name: "Main", width: 800, height: 600 },
    });
    assert.equal(made.status, 201, JSON.stringify(made.json));
    restaurantId = made.json.restaurant.id;
    slug = made.json.restaurant.slug;
    created.restaurantIds.push(restaurantId);

    const floors = await call("GET", `/api/restaurants/${restaurantId}/floors`, owner);
    const floorId = floors.json.floors[0].id as string;
    table = `it-rtable-${tag}`;
    const saved = await call("PUT", `/api/restaurants/${restaurantId}/floors/${floorId}/layout`, owner, {
      objects: [
        {
          id: table, type: "ROUND_TABLE", x: 2, y: 2, width: 0.9, height: 0.9, rotation: 0, zIndex: 1, locked: false,
          metadata: { capacity: 4, label: "T1" },
        },
      ],
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    const published = await call("PATCH", `/api/restaurants/${restaurantId}/status`, owner, { status: "ACTIVE" });
    assert.equal(published.status, 200, JSON.stringify(published.json));
  });

  after(async () => {
    const db = await openDb();
    try {
      for (const id of created.restaurantIds) {
        // Reviews hold their reservation (RESTRICT): they go first.
        for (const row of await db.orm.public.Review.where({ restaurantId: id }).all()) {
          await db.orm.public.Review.where({ id: row.id }).delete();
        }
        for (const row of await db.orm.public.Favorite.where({ restaurantId: id }).all()) {
          await db.orm.public.Favorite.where({ id: row.id }).delete();
        }
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

  describe("profile edit", () => {
    it("updates the fields, keeps the slug, and clears an optional field with an empty string", async () => {
      const res = await call("PATCH", `/api/restaurants/${restaurantId}`, owner, {
        name: `IT Renamed ${tag}`,
        description: "A calm place.",
        address: "1 Test Street",
        phone: "+216 71 000 000",
        email: "Hello@Example.Test",
      });
      assert.equal(res.status, 200, JSON.stringify(res.json));
      assert.equal(res.json.restaurant.name, `IT Renamed ${tag}`);
      assert.equal(res.json.restaurant.slug, slug); // links stay stable
      assert.equal(res.json.restaurant.email, "hello@example.test");

      const cleared = await call("PATCH", `/api/restaurants/${restaurantId}`, owner, { phone: "" });
      assert.equal(cleared.status, 200, JSON.stringify(cleared.json));
      assert.equal(cleared.json.restaurant.phone, null);
      assert.equal(cleared.json.restaurant.description, "A calm place."); // untouched
    });

    it("refuses bad values with a field name, and an empty name", async () => {
      const email = await call("PATCH", `/api/restaurants/${restaurantId}`, owner, { email: "nope" });
      assert.equal(email.status, 422);
      assert.equal(email.json.field, "email");
      const phone = await call("PATCH", `/api/restaurants/${restaurantId}`, owner, { phone: "abc" });
      assert.equal(phone.json.field, "phone");
      const name = await call("PATCH", `/api/restaurants/${restaurantId}`, owner, { name: " " });
      assert.equal(name.status, 422);
      assert.equal(name.json.field, "name");
    });

    it("logs the names of the changed fields, never the contact values", async () => {
      const db = await openDb();
      try {
        const logs = (await db.orm.public.AuditLog.where({ restaurantId, entityType: "Restaurant" }).all()) as Json[];
        const edits = logs.filter((log) => log.action === "UPDATE");
        assert.ok(edits.length >= 2);
        const flat = JSON.stringify(edits.map((log) => log.metadata));
        assert.ok(flat.includes("email") && flat.includes("phone"));
        assert.ok(!flat.includes("hello@example.test") && !flat.includes("+216 71 000 000"));
      } finally {
        await db.close?.();
      }
    });

    it("needs a token, and refuses a customer or the owner of another restaurant", async () => {
      assert.equal((await call("PATCH", `/api/restaurants/${restaurantId}`, null, { name: "Nope" })).status, 401);
      for (const token of [customer, stranger]) {
        assert.equal((await call("PATCH", `/api/restaurants/${restaurantId}`, token, { name: "Nope" })).status, 403);
        assert.equal((await call("PUT", `/api/restaurants/${restaurantId}/hours`, token, { hours: normalHours() })).status, 403);
        assert.equal((await call("GET", `/api/restaurants/${restaurantId}/hours`, token)).status, 403);
      }
      assert.equal((await call("GET", `/api/restaurants/${restaurantId}/hours`, null)).status, 401);
    });
  });

  describe("opening hours", () => {
    it("reads the 7 days", async () => {
      const res = await call("GET", `/api/restaurants/${restaurantId}/hours`, owner);
      assert.equal(res.status, 200, JSON.stringify(res.json));
      assert.equal(res.json.hours.length, 7);
      assert.deepEqual(res.json.hours[1], { dayOfWeek: 1, isClosed: false, openTime: "10:00", closeTime: "23:00" });
    });

    it("refuses equal times, a missing time, a wrong count and a repeated weekday", async () => {
      const equal = await call("PUT", `/api/restaurants/${restaurantId}/hours`, owner, {
        hours: normalHours({ 2: { openTime: "09:00", closeTime: "09:00" } }),
      });
      assert.equal(equal.status, 422, JSON.stringify(equal.json));
      assert.match(equal.json.message, /Tuesday/);
      const missing = await call("PUT", `/api/restaurants/${restaurantId}/hours`, owner, {
        hours: normalHours({ 3: { closeTime: null } }),
      });
      assert.equal(missing.status, 422);
      assert.equal((await call("PUT", `/api/restaurants/${restaurantId}/hours`, owner, { hours: normalHours().slice(0, 6) })).status, 422);
      const repeated = normalHours();
      repeated[6] = { ...repeated[6], dayOfWeek: 0 };
      assert.equal((await call("PUT", `/api/restaurants/${restaurantId}/hours`, owner, { hours: repeated })).status, 422);
    });

    it("accepts a Sunday from 12:00 to 03:00 and a closed Monday, and books Sunday 22:00", async () => {
      const put = await call("PUT", `/api/restaurants/${restaurantId}/hours`, owner, {
        hours: normalHours({ 0: { openTime: "12:00", closeTime: "03:00" }, 1: { isClosed: true, openTime: null, closeTime: null } }),
      });
      assert.equal(put.status, 200, JSON.stringify(put.json));
      assert.equal(put.json.hours[0].closeTime, "03:00");
      assert.equal(put.json.hours[1].isClosed, true);

      const sunday = nextWeekday(0);
      const evening = await book(customer, sunday.toString(), "22:00");
      assert.equal(evening.status, 201, JSON.stringify(evening.json));

      // A slot after midnight belongs to Sunday's window even though Monday is closed.
      const monday = sunday.add({ days: 1 });
      const night = await book(customer, monday.toString(), "00:30", { guestCount: 1 });
      assert.equal(night.status, 201, JSON.stringify(night.json));
      const tooLate = await book(customer, monday.toString(), "02:00");
      assert.equal(tooLate.status, 422); // would end at 03:30, past the 03:00 closing
      assert.equal(tooLate.json.code, "OUTSIDE_HOURS");
      const closedMorning = await book(customer, monday.toString(), "11:00");
      assert.equal(closedMorning.json.code, "OUTSIDE_HOURS");
    });

    it("reports availability for a night slot, and the public page keeps the night hours", async () => {
      const monday = nextWeekday(0, 10).add({ days: 1 });
      const free = await call(
        "GET",
        `/api/discover/restaurants/${restaurantId}/availability?date=${monday.toString()}&time=00:30&guests=2`,
        customer
      );
      assert.equal(free.status, 200, JSON.stringify(free.json));
      assert.equal(free.json.availability.issue, null);
      assert.equal(free.json.availability.tables[0].state, "free");

      const detail = await call("GET", `/api/discover/restaurants/${restaurantId}`, customer);
      assert.equal(detail.status, 200, JSON.stringify(detail.json));
      const sundayHours = (detail.json.restaurant.hours as Json[]).find((day) => day.dayOfWeek === 0);
      assert.equal(sundayHours?.openTime.slice(0, 5), "12:00");
      assert.equal(sundayHours?.closeTime.slice(0, 5), "03:00");
    });

    it("checks out with a pre-order after midnight too", async () => {
      const monday = nextWeekday(0, 17).add({ days: 1 });
      const res = await call("POST", "/api/reservations/checkout", customer, {
        reservation: { restaurantId, tableId: table, date: monday.toString(), time: "01:00", guestCount: 2 },
      });
      assert.equal(res.status, 201, JSON.stringify(res.json));
    });

    it("logs the hours change with the weekdays touched", async () => {
      const db = await openDb();
      try {
        const logs = (await db.orm.public.AuditLog.where({ restaurantId, entityType: "BusinessHours" }).all()) as Json[];
        assert.ok(logs.length >= 1);
        assert.deepEqual((logs.at(-1)?.metadata as Json).fields, ["hours"]);
      } finally {
        await db.close?.();
      }
    });
  });

  describe("cuisine, price level, images and discovery filters", () => {
    it("stores cuisine, price level, logo and cover, and accepts built-in photo paths", async () => {
      const res = await call("PATCH", `/api/restaurants/${restaurantId}`, owner, {
        cuisine: "Tunisian",
        priceLevel: 2,
        logoUrl: "https://example.test/logo.png",
        coverUrl: "/images/le-bistrot.jpg",
      });
      assert.equal(res.status, 200, JSON.stringify(res.json));
      assert.equal(res.json.restaurant.cuisine, "Tunisian");
      assert.equal(res.json.restaurant.priceLevel, 2);
      assert.equal(res.json.restaurant.logoUrl, "https://example.test/logo.png");
      assert.equal(res.json.restaurant.coverUrl, "/images/le-bistrot.jpg");
    });

    it("refuses a bad price level and bad links with the field name", async () => {
      for (const priceLevel of [0, 5, 2.5]) {
        const res = await call("PATCH", `/api/restaurants/${restaurantId}`, owner, { priceLevel });
        assert.equal(res.status, 422, String(priceLevel));
        assert.equal(res.json.field, "priceLevel");
      }
      const logo = await call("PATCH", `/api/restaurants/${restaurantId}`, owner, { logoUrl: "javascript:alert(1)" });
      assert.equal(logo.status, 422);
      assert.equal(logo.json.field, "logoUrl");
      const cover = await call("PATCH", `/api/restaurants/${restaurantId}`, owner, { coverUrl: "not a link" });
      assert.equal(cover.json.field, "coverUrl");
    });

    it("lets the database itself refuse a price level outside 1 to 4", async () => {
      const db = await openDb();
      try {
        await assert.rejects(() => db.orm.public.Restaurant.where({ id: restaurantId }).update({ priceLevel: 9 }));
        const row = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
        assert.equal(row.priceLevel, 2);
      } finally {
        await db.close?.();
      }
    });

    it("creates a restaurant with the new fields, and clears them with null or an empty value", async () => {
      const made = await call("POST", "/api/restaurants", owner, {
        name: `IT Fields ${tag}`,
        cuisine: "Seafood",
        priceLevel: 4,
        logoUrl: "https://example.test/l.png",
        hours: normalHours(),
        floor: { name: "Main", width: 800, height: 600 },
      });
      assert.equal(made.status, 201, JSON.stringify(made.json));
      created.restaurantIds.push(made.json.restaurant.id);
      assert.equal(made.json.restaurant.cuisine, "Seafood");
      assert.equal(made.json.restaurant.priceLevel, 4);
      assert.equal(made.json.restaurant.currency, "TND");
      const cleared = await call("PATCH", `/api/restaurants/${made.json.restaurant.id}`, owner, {
        cuisine: "",
        priceLevel: null,
        logoUrl: "",
      });
      assert.equal(cleared.status, 200, JSON.stringify(cleared.json));
      assert.equal(cleared.json.restaurant.cuisine, null);
      assert.equal(cleared.json.restaurant.priceLevel, null);
      assert.equal(cleared.json.restaurant.logoUrl, null);
    });

    const ids = async (query: string) => {
      const res = await call("GET", `/api/discover/restaurants${query}`, customer);
      assert.equal(res.status, 200, JSON.stringify(res.json));
      return { ids: (res.json.restaurants as Json[]).map((row) => row.id), json: res.json };
    };

    it("filters the public list by cuisine and price, ignoring case and accents", async () => {
      assert.ok((await ids("")).ids.includes(restaurantId));
      assert.ok((await ids("?cuisine=TUNISIAN")).ids.includes(restaurantId));
      assert.ok((await ids("?cuisine=tunis")).ids.includes(restaurantId));
      assert.ok(!(await ids("?cuisine=italian")).ids.includes(restaurantId));
      assert.ok((await ids("?price=2")).ids.includes(restaurantId));
      assert.ok((await ids("?price=1,2")).ids.includes(restaurantId));
      assert.ok(!(await ids("?price=3,4")).ids.includes(restaurantId));
      assert.ok((await ids("?cuisine=tunisian&price=2")).ids.includes(restaurantId));
      assert.ok(!(await ids("?cuisine=tunisian&price=4")).ids.includes(restaurantId));
      assert.ok((await ids(`?q=renamed&cuisine=tunisian`)).ids.includes(restaurantId)); // combines with search
    });

    it("returns the cuisine chips, the fields on the card and on the detail page", async () => {
      const { json } = await ids("");
      assert.ok((json.cuisines as string[]).includes("Tunisian"));
      const card = (json.restaurants as Json[]).find((row) => row.id === restaurantId) as Json;
      assert.equal(card.cuisine, "Tunisian");
      assert.equal(card.priceLevel, 2);
      assert.equal(card.currency, "TND");
      assert.equal(card.coverUrl, "/images/le-bistrot.jpg");
      const detail = await call("GET", `/api/discover/restaurants/${restaurantId}`, customer);
      assert.equal(detail.json.restaurant.priceLevel, 2);
      assert.equal(detail.json.restaurant.cuisine, "Tunisian");
    });

    it("refuses a bad price filter", async () => {
      assert.equal((await call("GET", "/api/discover/restaurants?price=9", customer)).status, 422);
      assert.equal((await call("GET", "/api/discover/restaurants?price=a", customer)).status, 422);
      assert.equal((await call("GET", "/api/discover/restaurants?price=1,,2", customer)).status, 422);
    });
  });

  describe("floors on and off", () => {
    let spareFloor = "";
    let mainFloor = "";

    const setActive = (floorId: string, isActive: boolean, token: string | null = owner, restaurant = restaurantId) =>
      call("PATCH", `/api/restaurants/${restaurant}/floors/${floorId}/active`, token, { isActive });

    it("refuses to switch off a floor that holds a reservation, saying how many", async () => {
      const floors = await call("GET", `/api/restaurants/${restaurantId}/floors`, owner);
      mainFloor = floors.json.floors[0].id;
      const res = await setActive(mainFloor, false);
      assert.equal(res.status, 409, JSON.stringify(res.json));
      assert.equal(res.json.code, "FLOOR_HAS_RESERVATIONS");
      assert.match(res.json.message, /\d+ upcoming or current reservations? (is|are) on this floor/);
    });

    it("switches a free floor off and on, and hides it from customers while it is off", async () => {
      const made = await call("POST", `/api/restaurants/${restaurantId}/floors`, owner, { name: "Terrace", width: 12, height: 8 });
      assert.equal(made.status, 201, JSON.stringify(made.json));
      spareFloor = made.json.floor.id;
      spareTable = `it-spare-${tag}`;
      const saved = await call("PUT", `/api/restaurants/${restaurantId}/floors/${spareFloor}/layout`, owner, {
        objects: [
          { id: spareTable, type: "ROUND_TABLE", x: 2, y: 2, width: 0.9, height: 0.9, rotation: 0, zIndex: 1, locked: false, metadata: { capacity: 2, label: "X1" } },
        ],
        publish: true,
      });
      assert.equal(saved.status, 200, JSON.stringify(saved.json));

      const visible = async () => {
        const detail = await call("GET", `/api/discover/restaurants/${restaurantId}`, customer);
        return (detail.json.restaurant.floors as Json[]).some((floor) => floor.id === spareFloor);
      };
      assert.equal(await visible(), true);

      const off = await setActive(spareFloor, false);
      assert.equal(off.status, 200, JSON.stringify(off.json));
      assert.equal((off.json.floors as Json[]).find((floor) => floor.id === spareFloor)?.isActive, false);
      assert.equal(await visible(), false);

      // A customer cannot book a table of a floor that is off.
      const refused = await book(customer, nextWeekday(3, 25).toString(), "19:00", { tableId: spareTable });
      assert.ok(refused.status >= 400, JSON.stringify(refused.json));

      const on = await setActive(spareFloor, true);
      assert.equal(on.status, 200);
      assert.equal(await visible(), true);
      assert.equal((await setActive(spareFloor, true)).status, 200); // already on: no error
    });

    it("keeps a floor on while a live reservation holds its table, and frees it once cancelled", async () => {
      const booked = await book(customer, nextWeekday(3, 26).toString(), "19:00", { tableId: spareTable, guestCount: 2 });
      assert.equal(booked.status, 201, JSON.stringify(booked.json));
      const blocked = await setActive(spareFloor, false);
      assert.equal(blocked.status, 409);
      assert.equal(blocked.json.code, "FLOOR_HAS_RESERVATIONS");

      const cancelled = await call("POST", `/api/reservations/${booked.json.reservation.id}/cancel`, customer);
      assert.equal(cancelled.status, 200);
      assert.equal((await setActive(spareFloor, false)).status, 200);
      assert.equal((await setActive(spareFloor, true)).status, 200);
    });

    it("refuses the last floor of a published restaurant, but not once it is a draft", async () => {
      const made = await call("POST", "/api/restaurants", owner, {
        name: `IT Floors ${tag}`,
        hours: normalHours(),
        floor: { name: "Only", width: 800, height: 600 },
      });
      assert.equal(made.status, 201, JSON.stringify(made.json));
      const id = made.json.restaurant.id as string;
      created.restaurantIds.push(id);
      const floorId = (await call("GET", `/api/restaurants/${id}/floors`, owner)).json.floors[0].id as string;
      const layout = await call("PUT", `/api/restaurants/${id}/floors/${floorId}/layout`, owner, {
        objects: [
          { id: `it-only-${tag}`, type: "ROUND_TABLE", x: 2, y: 2, width: 0.9, height: 0.9, rotation: 0, zIndex: 1, locked: false, metadata: { capacity: 2, label: "O1" } },
        ],
      });
      assert.equal(layout.status, 200, JSON.stringify(layout.json));
      assert.equal((await call("PATCH", `/api/restaurants/${id}/status`, owner, { status: "ACTIVE" })).status, 200);

      const refused = await setActive(floorId, false, owner, id);
      assert.equal(refused.status, 409, JSON.stringify(refused.json));
      assert.equal(refused.json.code, "LAST_ACTIVE_FLOOR");

      assert.equal((await call("PATCH", `/api/restaurants/${id}/status`, owner, { status: "DRAFT" })).status, 200);
      assert.equal((await setActive(floorId, false, owner, id)).status, 200);
    });

    it("needs a token, refuses customers and other owners, and hides floors of other restaurants", async () => {
      assert.equal((await setActive(mainFloor, false, null)).status, 401);
      assert.equal((await setActive(mainFloor, false, customer)).status, 403);
      assert.equal((await setActive(mainFloor, false, stranger)).status, 403);
      const otherId = created.restaurantIds[1];
      assert.equal((await setActive(mainFloor, false, owner, otherId)).status, 404);
      assert.equal((await call("PATCH", `/api/restaurants/${restaurantId}/floors/${mainFloor}/active`, owner, { isActive: "no" })).status, 422);
    });

    it("logs each switch", async () => {
      const db = await openDb();
      try {
        const logs = (await db.orm.public.AuditLog.where({ restaurantId, entityType: "Floor", entityId: spareFloor }).all()) as Json[];
        const switches = logs.filter((log) => log.action === "STATUS_CHANGE");
        assert.ok(switches.length >= 4, String(switches.length));
        assert.ok(switches.some((log) => (log.metadata as Json).isActive === false));
        assert.ok(switches.some((log) => (log.metadata as Json).isActive === true));
      } finally {
        await db.close?.();
      }
    });
  });

  describe("team roles", () => {
    let staffToken = "";
    let staffId = "";
    let membershipId = "";
    let otherRestaurantId = "";

    const flags = async () => {
      const me = await call("GET", "/api/auth/me", staffToken);
      assert.equal(me.status, 200, JSON.stringify(me.json));
      return { manage: me.json.user.canManageRestaurants as boolean, staff: me.json.user.isStaff as boolean };
    };
    const changeRole = (role: unknown, token: string | null = owner, member = membershipId, restaurant = restaurantId) =>
      call("PATCH", `/api/restaurants/${restaurant}/staff/${member}/role`, token, { role });

    it("a staff member joins and is accepted", async () => {
      const account = await signUp("staff", "rstaff");
      staffToken = account.token;
      staffId = account.id;
      otherRestaurantId = created.restaurantIds[1];
      const joined = await call("POST", "/api/staff/join", staffToken, { restaurantId });
      assert.equal(joined.status, 201, JSON.stringify(joined.json));
      const accepted = await call("POST", `/api/restaurants/${restaurantId}/staff/requests/${joined.json.request.id}`, owner, { decision: "ACCEPT" });
      assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
      membershipId = accepted.json.review.member.id;
      assert.equal(accepted.json.review.member.role, "STAFF");
      assert.deepEqual(await flags(), { manage: false, staff: true });
      assert.equal((await call("GET", `/api/restaurants/${restaurantId}/reservations`, staffToken)).status, 403);
    });

    it("refuses wrong roles and people who are not the owner", async () => {
      assert.equal((await changeRole("OWNER")).status, 422);
      assert.equal((await changeRole("STAFF")).status, 409); // already staff
      assert.equal((await changeRole("MANAGER", staffToken)).status, 403); // self-promotion by a staff member
      assert.equal((await changeRole("MANAGER", stranger)).status, 403);
      assert.equal((await changeRole("MANAGER", customer)).status, 403);
      assert.equal((await changeRole("MANAGER", null)).status, 401);
      assert.equal((await changeRole("MANAGER", owner, membershipId, otherRestaurantId)).status, 404); // other restaurant
    });

    it("the owner names a manager: access follows at once, the person is notified, the roster shows it", async () => {
      const res = await changeRole("MANAGER");
      assert.equal(res.status, 200, JSON.stringify(res.json));
      assert.equal(res.json.member.role, "MANAGER");
      assert.deepEqual(await flags(), { manage: true, staff: false });
      assert.equal((await call("GET", `/api/restaurants/${restaurantId}/reservations`, staffToken)).status, 200);

      const notes = (await call("GET", "/api/notifications", staffToken)).json.notifications as Json[];
      const note = notes.find((row) => row.title === "You are now a manager");
      assert.ok(note, JSON.stringify(notes.map((row) => row.title)));
      assert.equal(note.type, "STAFF_REQUEST");
      assert.equal(note.data.role, "MANAGER");

      const roster = (await call("GET", `/api/restaurants/${restaurantId}/staff`, owner)).json.roster;
      assert.equal(roster.members.find((member: Json) => member.id === membershipId)?.role, "MANAGER");
    });

    it("a manager cannot change roles, not even their own, and nobody can touch the owner", async () => {
      assert.equal((await changeRole("STAFF", staffToken)).status, 403);
      const db = await openDb();
      let ownerMembership = "";
      try {
        const row = await db.orm.public.RestaurantMembership.where({ restaurantId, userId: ownerId }).first();
        ownerMembership = row.id;
      } finally {
        await db.close?.();
      }
      const owner403 = await changeRole("STAFF", owner, ownerMembership);
      assert.equal(owner403.status, 403, JSON.stringify(owner403.json));
      assert.equal((await changeRole("MANAGER", owner, ownerMembership)).status, 403);
      assert.equal((await changeRole("STAFF", staffToken, ownerMembership)).status, 403);
    });

    it("the owner takes the role back: access goes away, with a notification", async () => {
      const res = await changeRole("STAFF");
      assert.equal(res.status, 200, JSON.stringify(res.json));
      assert.equal(res.json.member.role, "STAFF");
      assert.deepEqual(await flags(), { manage: false, staff: true });
      assert.equal((await call("GET", `/api/restaurants/${restaurantId}/reservations`, staffToken)).status, 403);
      const notes = (await call("GET", "/api/notifications", staffToken)).json.notifications as Json[];
      assert.ok(notes.some((row) => row.title === "Your role changed"));
    });

    it("logs the change with the previous and the new role", async () => {
      const db = await openDb();
      try {
        const logs = (await db.orm.public.AuditLog.where({ restaurantId, entityType: "RestaurantMembership", entityId: membershipId }).all()) as Json[];
        const changes = logs.filter((log) => log.action === "UPDATE").map((log) => log.metadata as Json);
        const pairs = changes.map((meta) => `${meta.from}>${meta.to}`).sort();
        assert.deepEqual(pairs, ["MANAGER>STAFF", "STAFF>MANAGER"]);
        assert.ok(changes.every((meta) => meta.memberId === staffId));
      } finally {
        await db.close?.();
      }
    });
  });

  describe("reviews, favorites and reservation changes", () => {
    let customer2 = "";
    let customer2Id = "";
    let draftRestaurantId = "";
    let reviewedIds: string[] = [];

    /** Moves a test reservation so that it starts `minutes` from now and lasts 90 minutes. */
    async function shift(reservationId: string, minutes: number) {
      const db = await openDb();
      try {
        const start = Temporal.Now.instant().add({ minutes });
        await db.orm.public.Reservation.where({ id: reservationId }).update({ startsAt: start, endsAt: start.add({ minutes: 90 }) });
      } finally {
        await db.close?.();
      }
    }

    const moveTo = (id: string, status: string) =>
      call("PATCH", `/api/restaurants/${restaurantId}/reservations/${id}/status`, owner, { status });

    /** A reservation of `token`, taken through to COMPLETED by the restaurant. */
    async function completed(token: string, daysAhead: number) {
      const res = await book(token, nextWeekday(3, daysAhead).toString(), "19:00", { guestCount: 2 });
      assert.equal(res.status, 201, JSON.stringify(res.json));
      const id = res.json.reservation.id as string;
      await shift(id, 10);
      assert.equal((await moveTo(id, "SEATED")).status, 200);
      assert.equal((await moveTo(id, "COMPLETED")).status, 200);
      return id;
    }

    before(async () => {
      const account = await signUp("customer", "rcustomer2");
      customer2 = account.token;
      customer2Id = account.id;
      draftRestaurantId = created.restaurantIds[1]; // the draft created by the fields tests
    });

    describe("reviews", () => {
      let pending = "";
      let first = "";

      const review = (id: string, body: unknown, token: string | null = customer) =>
        call("POST", `/api/reservations/${id}/review`, token, body);

      it("refuses a reservation that is not completed", async () => {
        const res = await book(customer, nextWeekday(3, 29).toString(), "19:00");
        assert.equal(res.status, 201, JSON.stringify(res.json));
        pending = res.json.reservation.id;
        const refused = await review(pending, { rating: 5 });
        assert.equal(refused.status, 409);
        assert.equal(refused.json.code, "NOT_REVIEWABLE");
      });

      it("takes a rating from 1 to 5 and a comment up to 1000 characters, nothing else", async () => {
        first = await completed(customer, 8);
        for (const rating of [0, 6, 2.5, "5", null]) {
          const res = await review(first, { rating });
          assert.equal(res.status, 422, JSON.stringify(rating));
        }
        assert.equal((await review(first, { rating: 5, comment: "x".repeat(1001) })).status, 422);
        assert.equal((await review(first, {})).status, 422);
      });

      it("needs a token and the owner of the reservation", async () => {
        assert.equal((await review(first, { rating: 5 }, null)).status, 401);
        assert.equal((await review(first, { rating: 5 }, customer2)).status, 403);
        assert.equal((await review("nope", { rating: 5 })).status, 404);
      });

      it("publishes a review of a completed reservation, once, under a short name", async () => {
        const ok = await review(first, { rating: 5, comment: "  Lovely evening  " });
        assert.equal(ok.status, 201, JSON.stringify(ok.json));
        assert.equal(ok.json.review.rating, 5);
        assert.equal(ok.json.review.comment, "Lovely evening");
        assert.equal(ok.json.review.author, "It R.");
        const again = await review(first, { rating: 1 });
        assert.equal(again.status, 409);
        assert.equal(again.json.code, "ALREADY_REVIEWED");
        reviewedIds = [first];
      });

      it("lets only one of two simultaneous reviews through", async () => {
        const id = await completed(customer, 15);
        const [a, b] = await Promise.all([review(id, { rating: 4 }), review(id, { rating: 4 })]);
        assert.deepEqual([a.status, b.status].sort(), [201, 409], JSON.stringify([a.json, b.json]));
        reviewedIds.push(id);
      });

      it("averages and counts with a third review, and shows them on cards and detail", async () => {
        const id = await completed(customer2, 22);
        const ok = await review(id, { rating: 4 }, customer2);
        assert.equal(ok.status, 201, JSON.stringify(ok.json));
        // 5 + 4 + 4 = 13 / 3 = 4.3
        const card = ((await call("GET", "/api/discover/restaurants", customer)).json.restaurants as Json[]).find((row) => row.id === restaurantId) as Json;
        assert.equal(card.averageRating, 4.3);
        assert.equal(card.reviewCount, 3);
        const detail = await call("GET", `/api/discover/restaurants/${restaurantId}`, customer);
        assert.equal(detail.json.restaurant.averageRating, 4.3);
        assert.equal(detail.json.restaurant.reviewCount, 3);
      });

      it("lists the reviews of a restaurant without sign-in, newest first, page by page", async () => {
        const all = await call("GET", `/api/discover/restaurants/${restaurantId}/reviews`, null);
        assert.equal(all.status, 200, JSON.stringify(all.json));
        assert.equal(all.json.count, 3);
        assert.equal(all.json.average, 4.3);
        const dates = (all.json.reviews as Json[]).map((row) => Date.parse(row.createdAt));
        assert.deepEqual(dates, [...dates].sort((x, y) => y - x));
        assert.ok(!JSON.stringify(all.json).includes("example.test")); // no e-mail leaks

        const one = await call("GET", `/api/discover/restaurants/${restaurantId}/reviews?page=1&pageSize=2`, null);
        assert.equal(one.json.reviews.length, 2);
        assert.equal(one.json.hasMore, true);
        const two = await call("GET", `/api/discover/restaurants/${restaurantId}/reviews?page=2&pageSize=2`, null);
        assert.equal(two.json.reviews.length, 1);
        assert.equal(two.json.hasMore, false);
        const ids = [...one.json.reviews, ...two.json.reviews].map((row: Json) => row.id);
        assert.equal(new Set(ids).size, 3);

        assert.equal((await call("GET", `/api/discover/restaurants/${restaurantId}/reviews?page=0`, null)).status, 422);
        assert.equal((await call("GET", `/api/discover/restaurants/${restaurantId}/reviews?pageSize=51`, null)).status, 422);
        assert.equal((await call("GET", `/api/discover/restaurants/${draftRestaurantId}/reviews`, null)).status, 404);
        assert.equal((await call("GET", "/api/discover/restaurants/nope/reviews", null)).status, 404);
      });

      it("marks the reviewed reservations in the customer's own list", async () => {
        const mine = (await call("GET", "/api/reservations", customer)).json.reservations as Json[];
        assert.equal(mine.find((row) => row.id === reviewedIds[0])?.review.rating, 5);
        assert.equal(mine.find((row) => row.id === pending)?.review, null);
      });
    });

    describe("favorites", () => {
      const add = (restaurant: string, token: string | null = customer) => call("POST", "/api/favorites", token, { restaurantId: restaurant });
      const remove = (restaurant: string, token: string | null = customer) => call("DELETE", `/api/favorites/${restaurant}`, token);
      const listed = async (token = customer) =>
        ((await call("GET", "/api/favorites", token)).json.restaurants as Json[]).map((row) => row.id);
      const isFavoriteOnCard = async (token: string) =>
        (((await call("GET", "/api/discover/restaurants", token)).json.restaurants as Json[]).find((row) => row.id === restaurantId) as Json).isFavorite;

      it("needs a token and a published restaurant", async () => {
        assert.equal((await add(restaurantId, null)).status, 401);
        assert.equal((await call("GET", "/api/favorites", null)).status, 401);
        assert.equal((await remove(restaurantId, null)).status, 401);
        assert.equal((await add("nope")).status, 404);
        assert.equal((await add(draftRestaurantId)).status, 404);
        assert.equal((await call("POST", "/api/favorites", customer, {})).status, 422);
      });

      it("adds once even when asked twice or at the same time, and shows the heart", async () => {
        assert.equal(await isFavoriteOnCard(customer), false);
        const [a, b] = await Promise.all([add(restaurantId), add(restaurantId)]);
        assert.deepEqual([a.status, b.status], [201, 201]);
        assert.equal((await add(restaurantId)).status, 201);

        const db = await openDb();
        try {
          const rows = (await db.orm.public.Favorite.where({ restaurantId }).all()) as Json[];
          assert.equal(rows.filter((row) => row.restaurantId === restaurantId).length, 1);
        } finally {
          await db.close?.();
        }

        assert.equal(await isFavoriteOnCard(customer), true);
        assert.equal(await isFavoriteOnCard(customer2), false); // favorites are personal
        const detail = await call("GET", `/api/discover/restaurants/${restaurantId}`, customer);
        assert.equal(detail.json.restaurant.isFavorite, true);
        assert.ok((await listed()).includes(restaurantId));
        assert.ok(!(await listed(customer2)).includes(restaurantId));
      });

      it("removes only the caller's own favorite, and removing twice is fine", async () => {
        assert.equal((await remove(restaurantId, customer2)).status, 200); // not theirs: nothing happens
        assert.ok((await listed()).includes(restaurantId));
        assert.equal((await remove(restaurantId)).status, 200);
        assert.equal((await remove(restaurantId)).status, 200);
        assert.ok(!(await listed()).includes(restaurantId));
        assert.equal(await isFavoriteOnCard(customer), false);
      });

      it("drops a favorite that is no longer published from the list", async () => {
        assert.equal((await add(restaurantId)).status, 201);
        const hidden = await call("PATCH", `/api/restaurants/${restaurantId}/status`, owner, { status: "DRAFT" });
        assert.equal(hidden.status, 200);
        assert.ok(!(await listed()).includes(restaurantId));
        assert.equal((await call("PATCH", `/api/restaurants/${restaurantId}/status`, owner, { status: "ACTIVE" })).status, 200);
        assert.ok((await listed()).includes(restaurantId));
        assert.equal((await remove(restaurantId)).status, 200);
      });
    });

    describe("changing a reservation", () => {
      let dishId = "";
      let reservationId = "";
      let orderId = "";
      let spareName = "";
      const change = (id: string, body: Json, token: string | null = customer) => call("PATCH", `/api/reservations/${id}`, token, body);
      // One Wednesday per call, a week apart, all within the 60 days a booking may look ahead.
      const week = (n: number) => nextWeekday(3, 10 + 7 * n);

      before(async () => {
        const menu = await call("POST", `/api/restaurants/${restaurantId}/menu`, owner, { name: "Change menu" });
        assert.equal(menu.status, 201, JSON.stringify(menu.json));
        const category = await call("POST", `/api/restaurants/${restaurantId}/menu/categories`, owner, { name: "Mains" });
        const categoryId = (category.json.category?.id ?? category.json.menu?.categories?.at(-1)?.id) as string;
        const item = await call("POST", `/api/restaurants/${restaurantId}/menu/items`, owner, { categoryId, name: "Soup", price: "6.000" });
        assert.equal(item.status, 201, JSON.stringify(item.json));
        dishId = (item.json.item?.id ?? (item.json.menu.categories as Json[]).flatMap((c) => c.items).find((i: Json) => i.name === "Soup").id) as string;
        assert.equal((await call("PATCH", `/api/restaurants/${restaurantId}/menu`, owner, { isPublished: true })).status, 200);
      });

      it("starts from a reservation with a pre-order", async () => {
        const made = await call("POST", "/api/reservations/checkout", customer, {
          reservation: { restaurantId, tableId: table, date: week(0).toString(), time: "19:00", guestCount: 2 },
          order: { items: [{ menuItemId: dishId, quantity: 2 }] },
        });
        assert.equal(made.status, 201, JSON.stringify(made.json));
        reservationId = made.json.reservation.id;
        orderId = made.json.order.id;
      });

      it("changes time, guests and notes on the same table, keeping the code", async () => {
        const before_ = (await call("GET", "/api/reservations", customer)).json.reservations.find((row: Json) => row.id === reservationId) as Json;
        const res = await change(reservationId, { tableId: table, date: week(0).toString(), time: "20:00", guestCount: 3, notes: "Window please" });
        assert.equal(res.status, 200, JSON.stringify(res.json));
        assert.equal(res.json.reservation.code, before_.code);
        assert.equal(res.json.reservation.guestCount, 3);
        assert.equal(res.json.reservation.notes, "Window please");
        assert.notEqual(res.json.reservation.startsAt, before_.startsAt);
        // Notes left out stay; an empty string clears them.
        const kept = await change(reservationId, { tableId: table, date: week(0).toString(), time: "20:00", guestCount: 3 });
        assert.equal(kept.json.reservation.notes, "Window please");
        const cleared = await change(reservationId, { tableId: table, date: week(0).toString(), time: "20:00", guestCount: 3, notes: "" });
        assert.equal(cleared.json.reservation.notes, null);
      });

      it("counts its own slot as free for itself, but taken for everybody else", async () => {
        const query = `date=${week(0).toString()}&time=20:00&guests=2`;
        const others = await call("GET", `/api/discover/restaurants/${restaurantId}/availability?${query}`, customer2);
        assert.equal(others.json.availability.tables.find((row: Json) => row.tableId === table).state, "taken");
        const mine = await call("GET", `/api/discover/restaurants/${restaurantId}/availability?${query}&exclude=${reservationId}`, customer);
        assert.equal(mine.json.availability.tables.find((row: Json) => row.tableId === table).state, "free");
        // Someone else cannot use the reservation id to see a free table.
        const trick = await call("GET", `/api/discover/restaurants/${restaurantId}/availability?${query}&exclude=${reservationId}`, customer2);
        assert.equal(trick.json.availability.tables.find((row: Json) => row.tableId === table).state, "taken");
      });

      it("moves to another table, refuses one that is too small, and keeps the pre-order attached", async () => {
        const tooSmall = await change(reservationId, { tableId: spareTable, date: week(0).toString(), time: "20:00", guestCount: 3 });
        assert.equal(tooSmall.status, 422);
        assert.equal(tooSmall.json.code, "TABLE_TOO_SMALL");

        const moved = await change(reservationId, { tableId: spareTable, date: week(0).toString(), time: "20:00", guestCount: 2 });
        assert.equal(moved.status, 200, JSON.stringify(moved.json));
        spareName = moved.json.reservation.table.name;
        assert.equal(moved.json.reservation.table.id, spareTable);

        const orders = (await call("GET", "/api/orders", customer)).json.orders as Json[];
        const mine = orders.find((row) => row.id === orderId) as Json;
        assert.equal(mine.reservation.id, reservationId);
        assert.equal(mine.reservation.tableName, spareName);
        assert.equal(mine.status, "PENDING");

        const freed = await call("GET", `/api/discover/restaurants/${restaurantId}/availability?date=${week(0).toString()}&time=20:00&guests=2`, customer2);
        assert.equal(freed.json.availability.tables.find((row: Json) => row.tableId === table).state, "free");
      });

      it("refuses a table that someone else holds, and leaves the reservation untouched", async () => {
        const rival = await book(customer2, week(1).toString(), "20:00", { tableId: table });
        assert.equal(rival.status, 201, JSON.stringify(rival.json));
        const before_ = (await call("GET", "/api/reservations", customer)).json.reservations.find((row: Json) => row.id === reservationId) as Json;
        const res = await change(reservationId, { tableId: table, date: week(1).toString(), time: "20:30", guestCount: 2 });
        assert.equal(res.status, 409, JSON.stringify(res.json));
        assert.equal(res.json.code, "SLOT_TAKEN");
        const after_ = (await call("GET", "/api/reservations", customer)).json.reservations.find((row: Json) => row.id === reservationId) as Json;
        assert.deepEqual([after_.startsAt, after_.table.id], [before_.startsAt, before_.table.id]);
      });

      it("applies the booking rules: opening hours, lead time, night hours, bad values", async () => {
        const base = { tableId: table, guestCount: 2 };
        const late = await change(reservationId, { ...base, date: week(2).toString(), time: "23:30" });
        assert.equal(late.status, 422);
        assert.equal(late.json.code, "OUTSIDE_HOURS");
        const past = await change(reservationId, { ...base, date: nextWeekday(3, -7).toString(), time: "19:00" });
        assert.equal(past.status, 422);
        assert.equal(past.json.code, "TOO_SOON");
        const far = await change(reservationId, { ...base, date: nextWeekday(3, 70).toString(), time: "19:00" });
        assert.equal(far.json.code, "TOO_FAR");
        assert.equal((await change(reservationId, { ...base, date: "nope", time: "19:00" })).status, 422);
        assert.equal((await change(reservationId, { ...base, date: week(2).toString(), time: "19:00", guestCount: 0 })).status, 422);
        assert.equal((await change(reservationId, { ...base, tableId: "nope", date: week(2).toString(), time: "19:00" })).status, 404);

        // Sunday opens 12:00 to 03:00: a slot after midnight belongs to the Sunday window.
        const night = await change(reservationId, { tableId: table, guestCount: 2, date: nextWeekday(1, 24).toString(), time: "00:30" });
        assert.equal(night.status, 200, JSON.stringify(night.json));
      });

      it("is for the owner of the reservation, and for reservations that have not started", async () => {
        const body = { tableId: table, date: week(3).toString(), time: "19:00", guestCount: 2 };
        assert.equal((await change(reservationId, body, null)).status, 401);
        assert.equal((await change(reservationId, body, customer2)).status, 403);
        assert.equal((await change("nope", body)).status, 404);

        const done = reviewedIds[0]; // completed
        const refused = await change(done, body);
        assert.equal(refused.status, 409);
        assert.equal(refused.json.code, "NOT_MODIFIABLE");

        const other = await book(customer, week(4).toString(), "19:00", { tableId: spareTable });
        assert.equal(other.status, 201, JSON.stringify(other.json));
        await call("POST", `/api/reservations/${other.json.reservation.id}/cancel`, customer);
        assert.equal((await change(other.json.reservation.id, body)).json.code, "NOT_MODIFIABLE");

        const started = await book(customer, week(5).toString(), "19:00", { tableId: spareTable });
        await shift(started.json.reservation.id, -5);
        assert.equal((await change(started.json.reservation.id, body)).json.code, "NOT_MODIFIABLE");
      });

      it("never double-books when two reservations swap tables at the same moment", async () => {
        const slot = { date: week(6).toString(), time: "19:00" };
        const x = await book(customer, slot.date, slot.time, { tableId: table });
        const y = await book(customer2, slot.date, slot.time, { tableId: spareTable });
        assert.equal(x.status, 201, JSON.stringify(x.json));
        assert.equal(y.status, 201, JSON.stringify(y.json));
        const started = Date.now();
        const [a, b] = await Promise.all([
          change(x.json.reservation.id, { tableId: spareTable, ...slot, guestCount: 2 }, customer),
          change(y.json.reservation.id, { tableId: table, ...slot, guestCount: 2 }, customer2),
        ]);
        assert.ok(Date.now() - started < 15_000, "the two changes must not wait on each other");
        for (const res of [a, b]) assert.ok([200, 409].includes(res.status), JSON.stringify(res.json));

        const mine = (await call("GET", "/api/reservations", customer)).json.reservations as Json[];
        const theirs = (await call("GET", "/api/reservations", customer2)).json.reservations as Json[];
        const live = [...mine, ...theirs].filter((row) => [x.json.reservation.id, y.json.reservation.id].includes(row.id));
        assert.equal(new Set(live.map((row) => row.table.id)).size, 2, "two reservations ended up on one table");
      });

      it("logs the change with the fields that moved", async () => {
        const db = await openDb();
        try {
          const logs = (await db.orm.public.AuditLog.where({ restaurantId, entityType: "Reservation", entityId: reservationId }).all()) as Json[];
          const edits = logs.filter((log) => log.action === "UPDATE").map((log) => (log.metadata as Json).fields as string[]);
          assert.ok(edits.some((fields) => fields.includes("table")), JSON.stringify(edits));
          assert.ok(edits.some((fields) => fields.includes("guests")));
          assert.ok(edits.some((fields) => fields.includes("time")));
        } finally {
          await db.close?.();
        }
        assert.ok(customer2Id.length > 0);
      });
    });
  });
});

/**
 * Seeds the DEMO data used by the automatic demo (DEMO_MODE=true).
 *
 * Run:  npm run seed:demo
 *       (node --experimental-strip-types scripts/seed-demo.ts)
 *
 * Creates 3 demo accounts (client, manager, staff) and one published restaurant
 * with a floor plan, a menu, a promotion, reservations, orders and a review.
 *
 * Idempotent / reset: every demo row has a fixed id (01DM...). On each run the
 * restaurant's data is deleted row by row, by exact id (or by the demo
 * restaurant / demo user id), then recreated with times relative to "now".
 * Nothing else in the database is ever touched. The 3 user accounts are kept
 * if they already exist (same email) and are never deleted.
 *
 * The demo accounts get a random, never-printed password: nobody can sign in
 * with it. They are only reachable through POST /api/demo/login (DEMO_MODE).
 *
 * Data layer: MongoDB through lib/db.ts (the `db.orm.public.<Model>` adapter).
 * MongoDB has no ON DELETE CASCADE, so the reset deletes children explicitly.
 *
 * Refuses to run in production or against a non-local MongoDB host
 * (MONGODB_URI must point to localhost / 127.0.0.1, never to Atlas).
 * Never prints MONGODB_URI or any password hash.
 */
import "temporal-polyfill/full/global";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Temporal } from "temporal-polyfill";

// ─── Safety guard ─────────────────────────────────────────────────────────────

if (existsSync(".env")) process.loadEnvFile(".env");

function fail(message: string): never {
  console.error(`seed-demo: ${message}`);
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  fail('refusing to run with NODE_ENV="production".');
}

// Same resolution order as lib/db.ts, so the guard checks the database that will really be used.
const mongoUri =
  process.env.MONGODB_URI ||
  (process.env.DATABASE_URL?.startsWith("mongodb") ? process.env.DATABASE_URL : "") ||
  "mongodb://127.0.0.1:27017/restivo";

let host: string;
try {
  host = new URL(mongoUri).hostname;
} catch {
  fail("MONGODB_URI is not a valid URL.");
}
if (host !== "localhost" && host !== "127.0.0.1") {
  fail("refusing to run: the MongoDB host is not localhost / 127.0.0.1 (no demo data on a shared or production database).");
}

// lib/db.ts reads MONGODB_URI when it is loaded, so it is imported only after the guard (and .env) above.
const { db, connectMongo, isMongoConnected } = await import("../lib/db.ts");
await connectMongo().catch(() => undefined);
if (!(await isMongoConnected())) {
  // Without this check the adapter would silently write to data/db.json instead.
  fail("cannot reach the local MongoDB (e.g. docker run -d --name restivo-mongo -p 27017:27017 mongo:7).");
}

// ─── Fixed ids and demo accounts ──────────────────────────────────────────────

/** 26 chars, Crockford base32 (no I, L, O, U), so it looks like a real ULID. */
const id = (code: string, n: number): string => `01DM${code}${String(n).padStart(20, "0")}`;

// Same emails as DEMO_EMAILS in lib/tour/demoScript.ts (the "@/" alias is not resolvable here).
const ACCOUNTS = [
  { key: "client", email: "demo-client@restivo.test", firstName: "Sarra", lastName: "Démo", managementRole: null },
  { key: "manager", email: "demo-gerant@restivo.test", firstName: "Amine", lastName: "Gérant", managementRole: "OWNER" },
  { key: "staff", email: "demo-personnel@restivo.test", firstName: "Yassine", lastName: "Service", managementRole: "STAFF" },
] as const;

const RESTAURANT_ID = id("RS", 1);
const FLOOR_ID = id("FR", 1);
const MENU_ID = id("MN", 1);
const PROMO_ID = id("PR", 1);
const TND_DECIMALS = 3;

const NOW = Temporal.Now.instant();
const inMinutes = (n: number) => NOW.add({ minutes: n });
const SLOT_MINUTES = 90; // lib/reservations/constants.ts

// ─── Demo content ─────────────────────────────────────────────────────────────

const TABLES = [
  { name: "T01", type: "STANDARD", capacity: 2, x: 3, y: 3, w: 1.2, h: 1.2 },
  { name: "T02", type: "STANDARD", capacity: 4, x: 7, y: 3, w: 1.4, h: 1.4 },
  { name: "T03", type: "STANDARD", capacity: 4, x: 11, y: 3, w: 2, h: 1.2 },
  { name: "T04", type: "STANDARD", capacity: 2, x: 15, y: 3, w: 1.2, h: 1.2 },
  { name: "T05", type: "STANDARD", capacity: 6, x: 4, y: 8, w: 2.4, h: 1.2 },
  { name: "T06", type: "BOOTH", capacity: 4, x: 9, y: 9, w: 2, h: 1.4 },
  { name: "T07", type: "BAR", capacity: 2, x: 14, y: 9, w: 1.6, h: 0.8 },
  { name: "T08", type: "STANDARD", capacity: 6, x: 9, y: 12, w: 2.4, h: 1.2 },
] as const;

const MENU = [
  {
    name: "Entrées",
    description: "Pour ouvrir le repas.",
    items: [
      { name: "Brik à l'œuf", description: "Feuille croustillante, œuf coulant, thon et câpres.", price: "6.500", featured: true },
      { name: "Salade méchouia", description: "Poivrons et tomates grillés, ail et huile d'olive.", price: "8.000" },
    ],
  },
  {
    name: "Plats",
    description: "Classiques tunisiens.",
    items: [
      { name: "Couscous à l'agneau", description: "Semoule roulée main, agneau et légumes mijotés.", price: "28.000", featured: true },
      { name: "Ojja aux merguez", description: "Sauce tomate pimentée, merguez maison et œufs.", price: "19.500" },
      { name: "Poisson grillé", description: "Pêche du jour grillée au charbon.", price: "32.000" },
    ],
  },
  {
    name: "Desserts et boissons",
    description: "Pour finir en douceur.",
    items: [
      { name: "Makroudh", description: "Semoule fourrée aux dattes, glacée au miel.", price: "5.500" },
      { name: "Assida zgougou", description: "Crème de pignons d'Alep aux fruits secs.", price: "7.500" },
      { name: "Thé à la menthe", description: "Thé vert à la menthe fraîche et aux pignons.", price: "4.500" },
    ],
  },
] as const;

// ─── Seed ─────────────────────────────────────────────────────────────────────

const orm = db.orm.public;

async function ensureUsers(): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const [index, account] of ACCOUNTS.entries()) {
    const existing = await orm.User.where({ email: account.email }).first();
    if (existing) {
      ids[account.key] = existing.id;
      await orm.User.where({ id: existing.id }).update({
        status: "ACTIVE",
        managementRole: account.managementRole,
      });
      console.log(`[kept]    ${account.email}`);
      continue;
    }
    // Random password, never printed: the account cannot be used with /signin.
    const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 12);
    const userId = id("AC", index + 1);
    await db.transaction(async (tx) => {
      await tx.orm.public.User.create({
        id: userId,
        email: account.email,
        passwordHash,
        managementRole: account.managementRole,
      });
      await tx.orm.public.Profile.create({
        userId,
        firstName: account.firstName,
        lastName: account.lastName,
        displayName: `${account.firstName} ${account.lastName}`,
        phone: null,
      });
    });
    ids[account.key] = userId;
    console.log(`[created] ${account.email}`);
  }
  return ids;
}

/** Deletes the demo restaurant's data row by row, children first. */
async function reset(userIds: string[]) {
  const reservations = await orm.Reservation.where({ restaurantId: RESTAURANT_ID }).all();
  for (const reservation of reservations) {
    const reviews = await orm.Review.where({ reservationId: reservation.id }).all();
    for (const review of reviews) await orm.Review.where({ id: review.id }).delete();
  }
  const orders = await orm.Order.where({ restaurantId: RESTAURANT_ID }).all();
  for (const order of orders) {
    await orm.OrderItem.where({ orderId: order.id }).delete();
    await orm.Order.where({ id: order.id }).delete();
  }
  for (const reservation of reservations) {
    await orm.Reservation.where({ id: reservation.id }).delete();
  }
  const notifications = await orm.Notification.where({ restaurantId: RESTAURANT_ID }).all();
  for (const row of notifications) await orm.Notification.where({ id: row.id }).delete();
  for (const userId of userIds) {
    const own = await orm.Notification.where({ userId }).all();
    for (const row of own) await orm.Notification.where({ id: row.id }).delete();
  }
  const audits = await orm.AuditLog.where({ restaurantId: RESTAURANT_ID }).all();
  for (const row of audits) await orm.AuditLog.where({ id: row.id }).delete();
  // No cascade in MongoDB: delete floors, tables, menu, promotions, hours, memberships and favorites by hand.
  const floors = await orm.Floor.where({ restaurantId: RESTAURANT_ID }).all();
  for (const floor of floors) {
    await orm.Table.where({ floorId: floor.id }).delete();
    await orm.FloorObject.where({ floorId: floor.id }).delete();
  }
  await orm.Floor.where({ restaurantId: RESTAURANT_ID }).delete();
  const menus = await orm.Menu.where({ restaurantId: RESTAURANT_ID }).all();
  for (const menu of menus) {
    const categories = await orm.MenuCategory.where({ menuId: menu.id }).all();
    for (const category of categories) await orm.MenuItem.where({ categoryId: category.id }).delete();
    await orm.MenuCategory.where({ menuId: menu.id }).delete();
  }
  await orm.Menu.where({ restaurantId: RESTAURANT_ID }).delete();
  const promotions = await orm.Promotion.where({ restaurantId: RESTAURANT_ID }).all();
  for (const promotion of promotions) await orm.PromotionItem.where({ promotionId: promotion.id }).delete();
  await orm.Promotion.where({ restaurantId: RESTAURANT_ID }).delete();
  await orm.BusinessHours.where({ restaurantId: RESTAURANT_ID }).delete();
  await orm.RestaurantMembership.where({ restaurantId: RESTAURANT_ID }).delete();
  await orm.RestaurantMembershipRequest.where({ restaurantId: RESTAURANT_ID }).delete();
  await orm.Favorite.where({ restaurantId: RESTAURANT_ID }).delete();
  const restaurant = await orm.Restaurant.where({ id: RESTAURANT_ID }).first();
  if (restaurant) await orm.Restaurant.where({ id: RESTAURANT_ID }).delete();
}

try {
  const users = await ensureUsers();
  const { client, manager, staff } = users;
  await reset([client, manager, staff]);

  // Restaurant, memberships, hours.
  await orm.Restaurant.create({
    id: RESTAURANT_ID,
    ownerId: manager,
    name: "Dar Restivo (démo)",
    slug: "demo-dar-restivo",
    description: "Restaurant de démonstration : cuisine tunisienne et plan de salle en direct.",
    logoUrl: null,
    coverUrl: null,
    cuisine: "Tunisienne",
    priceLevel: 2,
    phone: null,
    email: null,
    website: null,
    address: "Les Berges du Lac",
    city: "Tunis",
    country: "Tunisie",
    postalCode: null,
    latitude: null,
    longitude: null,
    currency: "TND",
    timezone: "Africa/Tunis",
    status: "ACTIVE",
  });
  await orm.RestaurantMembership.create({
    id: id("MB", 1),
    userId: manager,
    restaurantId: RESTAURANT_ID,
    role: "OWNER",
    status: "ACTIVE",
    joinedAt: NOW,
  });
  await orm.RestaurantMembership.create({
    id: id("MB", 2),
    userId: staff,
    restaurantId: RESTAURANT_ID,
    role: "STAFF",
    status: "ACTIVE",
    joinedAt: NOW,
  });
  for (let day = 0; day < 7; day += 1) {
    await orm.BusinessHours.create({
      id: id("HR", day + 1),
      restaurantId: RESTAURANT_ID,
      dayOfWeek: day,
      isClosed: false,
      openTime: "11:00",
      closeTime: "23:30",
    });
  }

  // Floor and tables.
  await orm.Floor.create({
    id: FLOOR_ID,
    restaurantId: RESTAURANT_ID,
    name: "Salle principale",
    level: 0,
    width: "20",
    height: "14",
    backgroundImageUrl: null,
    sortOrder: 0,
    isActive: true,
  });
  const tableId = (name: string) => id("TB", Number(name.slice(1)));
  for (const [index, table] of TABLES.entries()) {
    await orm.Table.create({
      id: tableId(table.name),
      floorId: FLOOR_ID,
      name: table.name,
      number: index + 1,
      type: table.type,
      capacity: table.capacity,
      minCapacity: null,
      x: String(table.x),
      y: String(table.y),
      width: String(table.w),
      height: String(table.h),
      rotation: "0",
      isActive: true,
    });
  }

  // Menu (published), dishes, promotion.
  await orm.Menu.create({
    id: MENU_ID,
    restaurantId: RESTAURANT_ID,
    name: "Carte",
    description: null,
    isPublished: true,
  });
  const dishId = new Map<string, string>();
  const dishPrice = new Map<string, string>();
  let dishNumber = 0;
  for (const [categoryIndex, category] of MENU.entries()) {
    const categoryId = id("CT", categoryIndex + 1);
    await orm.MenuCategory.create({
      id: categoryId,
      menuId: MENU_ID,
      name: category.name,
      description: category.description,
      imageUrl: null,
      sortOrder: categoryIndex,
      isActive: true,
    });
    for (const [itemIndex, item] of category.items.entries()) {
      if (item.price.split(".")[1]?.length !== TND_DECIMALS) {
        fail(`${item.name}: price must have exactly ${TND_DECIMALS} decimals.`);
      }
      dishNumber += 1;
      const itemId = id("DS", dishNumber);
      await orm.MenuItem.create({
        id: itemId,
        categoryId,
        name: item.name,
        description: item.description,
        imageUrl: null,
        price: item.price,
        preparationTime: null,
        isAvailable: true,
        isFeatured: "featured" in item && item.featured === true,
        sortOrder: itemIndex,
      });
      dishId.set(item.name, itemId);
      dishPrice.set(item.name, item.price);
    }
  }
  await orm.Promotion.create({
    id: PROMO_ID,
    restaurantId: RESTAURANT_ID,
    name: "Classiques tunisiens -15 %",
    description: "15 % sur deux plats signature.",
    type: "PERCENTAGE",
    value: "15",
    startsAt: NOW.subtract({ hours: 24 }),
    endsAt: NOW.add({ hours: 24 * 30 }),
    isActive: true,
  });
  for (const name of ["Couscous à l'agneau", "Makroudh"]) {
    await orm.PromotionItem.create({ promotionId: PROMO_ID, menuItemId: dishId.get(name)! });
  }

  // Reservations of the demo client (times relative to now).
  const RESERVATIONS = [
    { n: 1, table: "T01", guests: 2, start: 120, status: "CONFIRMED", notes: "Table près de la fenêtre." },
    { n: 2, table: "T02", guests: 4, start: -30, status: "SEATED", notes: null },
    { n: 3, table: "T03", guests: 4, start: 26 * 60, status: "CONFIRMED", notes: null },
    { n: 4, table: "T04", guests: 2, start: -26 * 60, status: "COMPLETED", notes: null },
    { n: 5, table: "T05", guests: 5, start: -10, status: "CONFIRMED", notes: "Anniversaire." },
  ] as const;
  for (const r of RESERVATIONS) {
    await orm.Reservation.create({
      id: id("RV", r.n),
      reservationCode: `DEMO-${String(r.n).padStart(4, "0")}`,
      restaurantId: RESTAURANT_ID,
      customerId: client,
      tableId: tableId(r.table),
      startsAt: inMinutes(r.start),
      endsAt: inMinutes(r.start + SLOT_MINUTES),
      guestCount: r.guests,
      status: r.status,
      notes: r.notes,
    });
  }

  // Orders: one confirmed (upcoming reservation), one in preparation (seated).
  const ORDERS = [
    {
      n: 1,
      reservation: 1,
      table: "T01",
      status: "CONFIRMED",
      subtotal: "41.000",
      discount: "4.200", // 15 % of the couscous
      total: "36.800",
      lines: [
        { name: "Brik à l'œuf", quantity: 2 },
        { name: "Couscous à l'agneau", quantity: 1 },
      ],
    },
    {
      n: 2,
      reservation: 2,
      table: "T02",
      status: "PREPARING",
      subtotal: "48.000",
      discount: "0.000",
      total: "48.000",
      lines: [
        { name: "Ojja aux merguez", quantity: 2 },
        { name: "Thé à la menthe", quantity: 2 },
      ],
    },
  ] as const;
  for (const order of ORDERS) {
    await orm.Order.create({
      id: id("DR", order.n),
      restaurantId: RESTAURANT_ID,
      customerId: client,
      reservationId: id("RV", order.reservation),
      tableId: tableId(order.table),
      status: order.status,
      notes: null,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
    });
    for (const [lineIndex, line] of order.lines.entries()) {
      await orm.OrderItem.create({
        id: id("DT", order.n * 10 + lineIndex + 1),
        orderId: id("DR", order.n),
        menuItemId: dishId.get(line.name)!,
        nameSnapshot: line.name,
        priceSnapshot: dishPrice.get(line.name)!,
        quantity: line.quantity,
        notes: null,
      });
    }
  }

  // Review on the completed reservation, and a favorite.
  await orm.Review.create({
    id: id("RW", 1),
    customerId: client,
    restaurantId: RESTAURANT_ID,
    reservationId: id("RV", 4),
    rating: 5,
    comment: "Accueil chaleureux et couscous excellent.",
    status: "PUBLISHED",
  });
  await orm.Favorite.create({ id: id("FV", 1), userId: client, restaurantId: RESTAURANT_ID });

  console.log("\nDemo data ready. Demo accounts:");
  for (const account of ACCOUNTS) console.log(`  ${account.key.padEnd(8)} ${account.email}`);
  console.log("\nEnable the demo with DEMO_MODE=true (see app/api/demo/login/route.ts).");
} finally {
  await db.close();
}
process.exit(0);

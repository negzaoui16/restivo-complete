/**
 * Fills the existing menu of the dev restaurant "EL Firma" with demo data.
 *
 * Run:  node --experimental-strip-types scripts/seed-dev-menu.ts
 *
 * Mirrors lib/menu/service.ts (createCategory, createItem, createPromotion and
 * their AuditLog entries) and the field rules of lib/menu/validation.ts. The
 * services themselves cannot be imported here because they use the "@/" alias,
 * which plain Node does not resolve.
 *
 * Reuses the restaurant's single menu: it never creates a menu and never
 * touches the menu's name, publication state or any existing promotion.
 * Idempotent: a category, dish or promotion with the same name is left as is.
 * Prices are decimal strings with the currency's decimals (TND = 3), no floats.
 * Refuses to run in production or against a non-local database host.
 * Never prints DATABASE_URL.
 */
import "temporal-polyfill/full/global";
import { existsSync } from "node:fs";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { db } from "../lib/db.ts";

// TND has 3 decimals (lib/orders/pricing.ts currencyDecimals). Not imported: tsc rejects ".ts" import paths.
const TND_DECIMALS = 3;

// ─── Safety guard ─────────────────────────────────────────────────────────────

if (existsSync(".env")) process.loadEnvFile(".env");

function fail(message: string): never {
  console.error(`seed-dev-menu: ${message}`);
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  fail('refusing to run with NODE_ENV="production".');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) fail("DATABASE_URL is not set (expected in .env).");

let host: string;
try {
  host = new URL(databaseUrl).hostname;
} catch {
  fail("DATABASE_URL is not a valid URL.");
}


// ─── Target and field rules (lib/menu/validation.ts) ──────────────────────────

const RESTAURANT_ID = "01M57TWY3WSMNDYADT6HXJPEC6";
const RESTAURANT_NAME = "EL Firma";

const optionalText = (max: number) => z.string().trim().min(1).max(max);

const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required.").max(60),
  description: optionalText(240),
});

const itemSchema = z.object({
  name: z.string().trim().min(2, "Item name is required.").max(80),
  description: optionalText(600),
  imageUrl: z.string().trim().url().max(400),
  price: z.string().regex(/^\d{1,6}\.\d+$/, "Price must be a decimal string."),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
});

const promotionSchema = z.object({
  name: z.string().trim().min(2, "Promotion name is required.").max(80),
  description: optionalText(400),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  value: z.string().regex(/^\d+(\.\d+)?$/),
});

// ─── Demo content ─────────────────────────────────────────────────────────────

/** Free photos from Wikimedia Commons (Special:FilePath redirects to the file, 640px wide). */
function photo(fileName: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName.replace(/ /g, "_"))}?width=640`;
}

type DemoItem = {
  name: string;
  description: string;
  price: string;
  file: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
};

const MENU: { name: string; description: string; items: DemoItem[] }[] = [
  {
    name: "Starters",
    description: "Small plates to open the meal.",
    items: [
      {
        name: "Brik à l'œuf",
        description:
          "Crisp golden pastry folded around a runny egg, tuna, capers and parsley. Best eaten hot, with a squeeze of lemon.",
        price: "6.500",
        file: "Tunisian Briks.JPG",
        isFeatured: true,
      },
      {
        name: "Salade méchouia",
        description:
          "Chargrilled peppers and tomatoes crushed with garlic, olive oil and caraway, topped with tuna and olives.",
        price: "8.000",
        file: "SaladeMechouia 2013.JPG",
      },
      {
        name: "Lablabi",
        description:
          "A warming chickpea broth poured over crusty bread, finished with cumin, harissa, a poached egg and olive oil.",
        price: "9.500",
        file: "Lablabi 3.JPG",
      },
    ],
  },
  {
    name: "Mains",
    description: "Hearty Tunisian classics, cooked to order.",
    items: [
      {
        name: "Couscous à l'agneau",
        description:
          "Hand-rolled semolina steamed over a slow-cooked lamb and vegetable stew, with chickpeas and a spoon of harissa.",
        price: "28.000",
        file: "Tunisian lamb couscous.jpg",
        isFeatured: true,
      },
      {
        name: "Ojja aux merguez",
        description:
          "Spicy tomato and pepper sauce simmered with homemade merguez sausages and finished with eggs.",
        price: "19.500",
        file: "Ojja merguez, Tunisie, avril 2019.jpg",
      },
      {
        name: "Poisson grillé",
        description:
          "Catch of the day grilled over charcoal, served with roasted vegetables and a lemon and olive oil dressing.",
        price: "32.000",
        file: "Poisson grillé - Sayada - Tunisie.jpg",
      },
      {
        name: "Kafteji",
        description:
          "Fried peppers, tomatoes, courgettes and potatoes chopped together and topped with an egg and spices.",
        price: "14.500",
        file: "Kafteji Kairouan.jpg",
        isAvailable: false,
      },
      {
        name: "Plat du chef",
        description:
          "The chef's tasting plate of the day: a little of everything, served with fresh bread and seasonal sides.",
        price: "35.000",
        file: "Tunisian meal 03.jpg",
        isFeatured: true,
      },
    ],
  },
  {
    name: "Desserts",
    description: "Sweet endings, honey and dates included.",
    items: [
      {
        name: "Makroudh",
        description:
          "Semolina pastry stuffed with dates, fried until golden and glazed with honey. Sweet, soft and fragrant.",
        price: "5.500",
        file: "Makrouds.JPG",
      },
      {
        name: "Assida zgougou",
        description:
          "Silky Aleppo pine seed cream topped with almonds, hazelnuts and pistachios. A winter favourite.",
        price: "7.500",
        file: "Assida Zgougou.JPG",
      },
      {
        name: "Salade de fruits",
        description: "Seasonal fruit cut to order with a hint of orange blossom water.",
        price: "6.000",
        file: "Fruit Salad 4.jpg",
      },
    ],
  },
  {
    name: "Drinks",
    description: "Hot, cold and refreshing.",
    items: [
      {
        name: "Thé à la menthe aux pignons",
        description:
          "Fresh mint green tea served in a glass with a spoonful of pine nuts floating on top, the Tunisian way.",
        price: "4.500",
        file: "Mint-tea.jpg",
      },
      {
        name: "Citronnade",
        description: "Freshly pressed lemons, a little sugar and mint leaves over ice.",
        price: "5.000",
        file: "Glass of lemonade.jpg",
      },
      {
        name: "Eau minérale",
        description: "Still mineral water, served chilled in a 50 cl bottle.",
        price: "2.500",
        file: "Water bottle in room.jpg",
      },
    ],
  },
];

const PROMOTION = {
  name: "Tunisian Classics 15% off",
  description: "15% off two of our signature dishes, for a limited time.",
  type: "PERCENTAGE" as const,
  value: "15",
  itemNames: ["Couscous à l'agneau", "Makroudh"],
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

// db imported from lib/db.ts

try {
  const restaurant = await db.orm.public.Restaurant.where({ id: RESTAURANT_ID }).first();
  if (!restaurant || restaurant.name !== RESTAURANT_NAME) {
    fail(`restaurant "${RESTAURANT_NAME}" (${RESTAURANT_ID}) not found.`);
  }
  if (restaurant.currency !== "TND") {
    fail(`expected a TND restaurant, got ${restaurant.currency}.`);
  }
  const decimals = TND_DECIMALS;
  const userId = restaurant.ownerId;

  // One menu per restaurant: reuse it, never create one.
  const menus = await db.orm.public.Menu.where({ restaurantId: restaurant.id }).all();
  const menu = menus[0];
  if (!menu) fail("the restaurant has no menu. Create it from the manager space first.");

  async function audit(entityType: string, entityId: string, name: string) {
    await db.orm.public.AuditLog.create({
      userId,
      restaurantId: restaurant!.id,
      action: "CREATE",
      entityType,
      entityId,
      metadata: { name, source: "seed-dev-menu" },
    });
  }

  const itemIdByName = new Map<string, string>();
  let createdCategories = 0;
  let createdItems = 0;

  for (const demo of MENU) {
    const parsedCategory = categorySchema.safeParse(demo);
    if (!parsedCategory.success) fail(`${demo.name}: ${parsedCategory.error.issues[0]?.message}`);

    const categories = await db.orm.public.MenuCategory.where({ menuId: menu.id }).all();
    let category = categories.find((c) => c.name.toLowerCase() === demo.name.toLowerCase());
    if (category) {
      console.log(`[skip]    category ${demo.name}`);
    } else {
      category = await db.orm.public.MenuCategory.create({
        menuId: menu.id,
        name: parsedCategory.data.name,
        description: parsedCategory.data.description,
        imageUrl: null,
        sortOrder: categories.length,
        isActive: true,
      });
      await audit("MenuCategory", category.id, category.name);
      createdCategories += 1;
      console.log(`[created] category ${demo.name}`);
    }

    for (const dish of demo.items) {
      const parsedItem = itemSchema.safeParse({
        name: dish.name,
        description: dish.description,
        imageUrl: photo(dish.file),
        price: dish.price,
        isAvailable: dish.isAvailable ?? true,
        isFeatured: dish.isFeatured ?? false,
      });
      if (!parsedItem.success) fail(`${dish.name}: ${parsedItem.error.issues[0]?.message}`);
      const body = parsedItem.data;
      if (body.price.split(".")[1]?.length !== decimals) {
        fail(`${dish.name}: price must have exactly ${decimals} decimals.`);
      }

      const siblings = await db.orm.public.MenuItem.where({ categoryId: category.id }).all();
      let item = siblings.find((i) => i.name.toLowerCase() === dish.name.toLowerCase());
      if (item) {
        console.log(`[skip]    dish ${dish.name}`);
      } else {
        item = await db.orm.public.MenuItem.create({
          categoryId: category.id,
          name: body.name,
          description: body.description,
          imageUrl: body.imageUrl,
          price: body.price,
          preparationTime: null,
          isAvailable: body.isAvailable,
          isFeatured: body.isFeatured,
          sortOrder: siblings.length,
        });
        await audit("MenuItem", item.id, item.name);
        createdItems += 1;
        console.log(`[created] dish ${dish.name}`);
      }
      itemIdByName.set(dish.name, item.id);
    }
  }

  // Promotion: new one, linked to two dishes. "AAA" is never touched.
  const parsedPromotion = promotionSchema.safeParse(PROMOTION);
  if (!parsedPromotion.success) fail(`promotion: ${parsedPromotion.error.issues[0]?.message}`);
  if (Number(PROMOTION.value) > 100) fail("promotion: percentage cannot exceed 100.");

  const promotions = await db.orm.public.Promotion.where({ restaurantId: restaurant.id }).all();
  let promotion = promotions.find((p) => p.name.toLowerCase() === PROMOTION.name.toLowerCase());
  if (promotion) {
    console.log(`[skip]    promotion ${PROMOTION.name}`);
  } else {
    const startsAt = Temporal.Now.instant();
    const endsAt = startsAt.add({ hours: 24 * 30 });
    promotion = await db.orm.public.Promotion.create({
      restaurantId: restaurant.id,
      name: parsedPromotion.data.name,
      description: parsedPromotion.data.description,
      type: parsedPromotion.data.type,
      value: parsedPromotion.data.value,
      startsAt,
      endsAt,
      isActive: true,
    });
    await audit("Promotion", promotion.id, promotion.name);
    console.log(`[created] promotion ${PROMOTION.name}`);
  }

  const links = await db.orm.public.PromotionItem.where({ promotionId: promotion.id }).all();
  for (const itemName of PROMOTION.itemNames) {
    const menuItemId = itemIdByName.get(itemName);
    if (!menuItemId) fail(`promotion: dish "${itemName}" not found.`);
    if (links.some((link) => link.menuItemId === menuItemId)) continue;
    await db.orm.public.PromotionItem.create({ promotionId: promotion.id, menuItemId });
    console.log(`[linked]  ${itemName} -> ${PROMOTION.name}`);
  }

  console.log(`done: ${createdCategories} categories and ${createdItems} dishes created.`);
} finally {
  await db.close?.();
}
process.exit(0);

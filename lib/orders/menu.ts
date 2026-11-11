/**
 * What a customer may order: the restaurant's published menu, active
 * categories, and the promotions live right now. Prices stay decimal strings
 * end to end and are priced with integers by `./pricing`.
 */
import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { OrderError } from "./errors";
import { currencyDecimals, formatMinor, parseDecimal, priceUnit, type PromotionInput } from "./pricing";
import type { DiscoverMenu } from "./types";

export type OrderableItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  /** Decimal string as stored. */
  price: string;
  categoryId: string;
  sortOrder: number;
  promotions: PromotionInput[];
  model3dUrl?: string | null;
};

export type OrderableMenu = {
  currency: string;
  decimals: number;
  menu: {
    name: string;
    description: string | null;
    categories: { id: string; name: string; description: string | null; sortOrder: number }[];
    items: Map<string, OrderableItem>;
  } | null;
};

function isLive(row: { isActive: boolean; startsAt: unknown; endsAt: unknown }, nowMs: number): boolean {
  if (!row.isActive) return false;
  const start = Temporal.Instant.from(String(row.startsAt)).epochMilliseconds;
  const end = Temporal.Instant.from(String(row.endsAt)).epochMilliseconds;
  return nowMs >= start && nowMs <= end;
}

export async function loadOrderableMenu(restaurantId: string): Promise<OrderableMenu> {
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  if (!restaurant) throw new OrderError("NOT_FOUND", "Restaurant not found.");
  const base = { currency: restaurant.currency, decimals: currencyDecimals(restaurant.currency) };

  const menus = await db.orm.public.Menu.where({ restaurantId }).all();
  const menu = menus[0];
  if (!menu || !menu.isPublished) return { ...base, menu: null };

  const nowMs = Temporal.Now.instant().epochMilliseconds;
  const categories = (await db.orm.public.MenuCategory.where({ menuId: menu.id }).all())
    .filter((category) => category.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const promotions = (await db.orm.public.Promotion.where({ restaurantId }).all()).filter((row) => isLive(row, nowMs));
  const promotionsByItem = new Map<string, PromotionInput[]>();
  for (const promotion of promotions) {
    const links = await db.orm.public.PromotionItem.where({ promotionId: promotion.id }).all();
    for (const link of links) {
      const list = promotionsByItem.get(link.menuItemId) ?? [];
      list.push({ id: promotion.id, type: promotion.type, value: String(promotion.value) });
      promotionsByItem.set(link.menuItemId, list);
    }
  }

  const items = new Map<string, OrderableItem>();
  for (const category of categories) {
    for (const row of await db.orm.public.MenuItem.where({ categoryId: category.id }).all()) {
      items.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        imageUrl: row.imageUrl,
        isAvailable: row.isAvailable,
        isFeatured: row.isFeatured,
        price: String(row.price),
        categoryId: category.id,
        sortOrder: row.sortOrder,
        promotions: promotionsByItem.get(row.id) ?? [],
        model3dUrl: row.model3dUrl
          ? row.model3dUrl.startsWith("data:")
            ? `/api/menu-items/${row.id}/3d`
            : row.model3dUrl
          : null,
      });
    }
  }

  return {
    ...base,
    menu: {
      name: menu.name,
      description: menu.description,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
      })),
      items,
    },
  };
}

function trimZeros(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

function promotionLabel(promotion: PromotionInput, currency: string, decimals: number): string {
  return promotion.type === "PERCENTAGE"
    ? `${trimZeros(promotion.value)}% off`
    : `${formatMinor(parseDecimal(promotion.value, decimals), decimals)} ${currency} off`;
}

/** Public menu view: list prices, sale prices and a label for the winning promotion. */
export async function getDiscoverMenu(restaurantId: string): Promise<DiscoverMenu> {
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  if (!restaurant || restaurant.status !== "ACTIVE") throw new OrderError("NOT_FOUND", "Restaurant not found.");

  const loaded = await loadOrderableMenu(restaurantId);
  const { currency, decimals } = loaded;
  if (!loaded.menu) return { currency, decimals, menu: null };

  const byCategory = new Map<string, OrderableItem[]>();
  for (const item of loaded.menu.items.values()) {
    byCategory.set(item.categoryId, [...(byCategory.get(item.categoryId) ?? []), item]);
  }

  return {
    currency,
    decimals,
    menu: {
      name: loaded.menu.name,
      description: loaded.menu.description,
      categories: loaded.menu.categories
        .map((category) => ({
          id: category.id,
          name: category.name,
          description: category.description,
          items: (byCategory.get(category.id) ?? [])
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => {
              const priced = priceUnit(item.price, item.promotions, decimals);
              const winner = item.promotions.find((promotion) => promotion.id === priced.promotionId);
              return {
                id: item.id,
                name: item.name,
                description: item.description,
                imageUrl: item.imageUrl,
                isAvailable: item.isAvailable,
                isFeatured: item.isFeatured,
                price: formatMinor(priced.unitPrice, decimals),
                salePrice: formatMinor(priced.unitPrice - priced.unitDiscount, decimals),
                promotionLabel: winner ? promotionLabel(winner, currency, decimals) : null,
                model3dUrl: item.model3dUrl || null,
              };
            }),
        }))
        .filter((category) => category.items.length > 0),
    },
  };
}

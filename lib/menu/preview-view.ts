import type { DiscoverMenu } from "@/lib/orders/types";
import { currencyDecimals, formatMinor, parseDecimal, priceUnit } from "@/lib/orders/pricing";
import type { PublicMenu } from "./types";

type BookMenu = NonNullable<DiscoverMenu["menu"]>;

function trimZeros(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

/**
 * The manager's menu as a customer would see it in the book: active categories
 * that hold dishes, dishes in menu order, and only promotions that are live now.
 * Mirrors `getDiscoverMenu`, but works on the manager's own data so a draft menu
 * can be previewed too.
 */
export function previewBookMenu(menu: PublicMenu): { decimals: number; book: BookMenu } {
  const { currency } = menu;
  const decimals = currencyDecimals(currency);
  const live = menu.promotions
    .filter((promotion) => promotion.isLive)
    .map((promotion) => ({
      id: promotion.id,
      type: promotion.type,
      value: String(promotion.value),
      menuItemIds: promotion.menuItemIds,
    }));

  const categories = menu.categories
    .filter((category) => category.isActive && category.items.length > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      items: category.items.map((item) => {
        const promotions = live.filter((promotion) => promotion.menuItemIds.includes(item.id));
        const priced = priceUnit(item.price, promotions, decimals);
        const winner = promotions.find((promotion) => promotion.id === priced.promotionId);
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          isAvailable: item.isAvailable,
          isFeatured: item.isFeatured,
          price: formatMinor(priced.unitPrice, decimals),
          salePrice: formatMinor(priced.unitPrice - priced.unitDiscount, decimals),
          promotionLabel: winner
            ? winner.type === "PERCENTAGE"
              ? `${trimZeros(winner.value)}% off`
              : `${formatMinor(parseDecimal(winner.value, decimals), decimals)} ${currency} off`
            : null,
        };
      }),
    }));

  return { decimals, book: { name: menu.name, description: menu.description, categories } };
}

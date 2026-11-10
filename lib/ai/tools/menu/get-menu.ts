import { getMenuTree } from "@/lib/menu/service";
import { listArgs, type ListArgs } from "../args";
import { defineTool } from "../types";

export const getMenu = defineTool({
  name: "get_menu",
  description:
    "Read this restaurant's menu: categories, dish names, prices, availability, and promotions. Optional limit caps how many dishes are returned.",
  parameters: listArgs.parameters,
  schema: listArgs.schema,
  run: readMenu,
});

async function readMenu(restaurantId: string, args: ListArgs) {
  const menu = await getMenuTree(restaurantId);
  if (!menu) return { found: false };

  const active = menu.categories.filter((category) => category.isActive);
  const total = active.reduce((sum, category) => sum + category.items.length, 0);
  let left = args.limit;

  return {
    found: true,
    id: menu.id,
    name: menu.name,
    published: menu.isPublished,
    itemCount: total,
    limit: args.limit,
    truncated: total > args.limit,
    categories: active
      .map((category) => {
        const items = category.items.slice(0, left).map((item) => ({
          name: item.name,
          price: Number(item.price),
          available: item.isAvailable,
          featured: item.isFeatured,
          promotion: item.promotionLabel,
        }));
        left -= items.length;
        return { name: category.name, items };
      })
      .filter((category) => category.items.length > 0),
    promotions: menu.promotions
      .filter((promotion) => promotion.isActive)
      .slice(0, args.limit)
      .map((promotion) => ({
        name: promotion.name,
        type: promotion.type,
        value: promotion.value,
        live: promotion.isLive,
      })),
  };
}

/**
 * Browser-side cart helpers. Amounts are BigInt minor units built from the
 * decimal strings of the menu API, never floats. The result is an estimate: the
 * server prices the order again when it is placed.
 */
import { formatMinor, parseDecimal } from "./pricing";
import type { DiscoverMenu, MenuItemView } from "./types";

export type Cart = Record<string, number>;

export type CartLine = { item: MenuItemView; quantity: number };

export function menuItems(menu: DiscoverMenu["menu"]): Map<string, MenuItemView> {
  if (!menu) return new Map();
  return new Map(menu.categories.flatMap((category) => category.items).map((item) => [item.id, item]));
}

/** Lines of the cart that still match an available dish on the current menu. */
export function cartLines(menu: DiscoverMenu["menu"], cart: Cart): CartLine[] {
  const items = menuItems(menu);
  const lines: CartLine[] = [];
  for (const [id, quantity] of Object.entries(cart)) {
    const item = items.get(id);
    if (item && item.isAvailable && quantity > 0) lines.push({ item, quantity });
  }
  return lines;
}

export function estimateCart(lines: CartLine[], decimals: number) {
  let subtotal = BigInt(0);
  let total = BigInt(0);
  for (const { item, quantity } of lines) {
    subtotal += parseDecimal(item.price, decimals) * BigInt(quantity);
    total += parseDecimal(item.salePrice, decimals) * BigInt(quantity);
  }
  return {
    subtotal: formatMinor(subtotal, decimals),
    discount: formatMinor(subtotal - total, decimals),
    total: formatMinor(total, decimals),
    hasDiscount: subtotal !== total,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

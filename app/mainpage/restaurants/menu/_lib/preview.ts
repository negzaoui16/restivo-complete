import type { PublicMenu } from "@/lib/menu/types";

export function formatMenuPrice(price: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-TN", {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
  return `${formatted} ${currency}`;
}

export function previewCategories(menu: PublicMenu) {
  return menu.categories
    .filter((category) => category.isActive)
    .map((category) => ({
      ...category,
      items: [...category.items].sort(
        (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder
      ),
    }))
    .filter((category) => category.items.length > 0);
}

export function restaurantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "R";
}

export const MENU_TABS = [
  "Items",
  "Categories",
  "Promotions",
  "Menu settings",
] as const;

export type MenuTab = (typeof MENU_TABS)[number];

export type FilterKey = "category" | "availability" | "promotion" | "price";

export type SortKey = "featured" | "price" | "name" | "order";

export const STATUS_STYLES = {
  available: { dot: "bg-emerald-500", text: "text-emerald-700", label: "Available" },
  unavailable: { dot: "bg-red-500", text: "text-red-700", label: "Unavailable" },
} as const;

export const FORM_INPUT_CLASS =
  "w-full bg-white rounded-xl border border-[#DFD8CC] px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#9E988F] focus:outline-none focus:border-[#B55234] focus:ring-2 focus:ring-[#B55234]/15 transition-all";

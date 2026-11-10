export type PromotionKind = "PERCENTAGE" | "FIXED_AMOUNT";

export type PublicMenuItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  model3dUrl?: string | null;
  /** Exact decimal string with the currency decimals, e.g. "18.500". */
  price: string;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
  preparationTime: number | null;
  promotionLabel: string | null;
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  itemCount: number;
  items: PublicMenuItem[];
};

export type PublicPromotion = {
  id: string;
  name: string;
  description: string | null;
  type: PromotionKind;
  value: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  isLive: boolean;
  menuItemIds: string[];
};

export type PublicMenu = {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  currency: string;
  categories: PublicMenuCategory[];
  promotions: PublicPromotion[];
};

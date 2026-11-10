/** Money is always a decimal string with the currency decimals (e.g. "12.500"). Never a float. */

export type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";

export type MenuItemView = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  price: string;
  /** Price after the best live promotion; equals `price` when none applies. */
  salePrice: string;
  promotionLabel: string | null;
  model3dUrl?: string | null;
};

export type MenuCategoryView = {
  id: string;
  name: string;
  description: string | null;
  items: MenuItemView[];
};

export type DiscoverMenu = {
  currency: string;
  decimals: number;
  /** Null when the restaurant has no published menu. */
  menu: { name: string; description: string | null; categories: MenuCategoryView[] } | null;
};

export type PublicOrderItem = {
  id: string;
  name: string;
  quantity: number;
  /** Unit price before any promotion. */
  unitPrice: string;
  notes: string | null;
};

export type PublicOrder = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  notes: string | null;
  currency: string;
  subtotal: string;
  discount: string;
  total: string;
  items: PublicOrderItem[];
  restaurant: { id: string; name: string; timezone: string };
  reservation: { id: string; code: string; startsAt: string; tableName: string } | null;
  /** True when the restaurant, not the customer, cancelled it. */
  cancelledByRestaurant: boolean;
};

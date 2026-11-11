import { Temporal } from "temporal-polyfill";
import { db } from "@/lib/db";
import { RestaurantError } from "@/lib/restaurants/errors";
import type {
  CreateCategoryBody,
  CreateItemBody,
  CreateMenuBody,
  CreatePromotionBody,
  UpdateCategoryBody,
  UpdateItemBody,
  UpdateMenuBody,
  UpdatePromotionBody,
} from "./validation";
import { formatPrice, normalizePrice } from "@/lib/orders/pricing";
import { moveRow, type Direction } from "./reorder";
import type {
  PublicMenu,
  PublicMenuCategory,
  PublicMenuItem,
  PublicPromotion,
} from "./types";

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value);
}

function toEpochMs(value: unknown): number {
  if (value && typeof value === "object" && "epochMilliseconds" in value) {
    return Number((value as { epochMilliseconds: number }).epochMilliseconds);
  }
  if (typeof value === "string") return Date.parse(value);
  return Number.NaN;
}

function parseInstant(value: string): Temporal.Instant {
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  if (withSeconds.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(withSeconds)) {
    return Temporal.Instant.from(withSeconds);
  }
  return Temporal.Instant.from(`${withSeconds}Z`);
}

function isPromotionLive(row: {
  isActive: boolean;
  startsAt: unknown;
  endsAt: unknown;
}): boolean {
  if (!row.isActive) return false;
  const now = Temporal.Now.instant().epochMilliseconds;
  const start = toEpochMs(row.startsAt);
  const end = toEpochMs(row.endsAt);
  return Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end;
}

function promotionLabel(row: {
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: unknown;
}): string {
  const value = toNumber(row.value);
  return row.type === "PERCENTAGE" ? `${value}% OFF` : `${value} OFF`;
}

async function restaurantCurrency(restaurantId: string): Promise<string> {
  const restaurant = await db.orm.public.Restaurant.where({ id: restaurantId }).first();
  return restaurant?.currency ?? "TND";
}

/** Exact price string for the restaurant currency, or a 422 naming the price field. */
async function validPrice(restaurantId: string, price: string | number): Promise<string> {
  const result = normalizePrice(price, await restaurantCurrency(restaurantId));
  if (!result.ok) throw new RestaurantError("VALIDATION_ERROR", result.message, "price");
  return result.value;
}

async function getPrimaryMenu(restaurantId: string) {
  const menus = await db.orm.public.Menu.where({ restaurantId }).all();
  return menus[0] ?? null;
}

async function requirePrimaryMenu(restaurantId: string) {
  const menu = await getPrimaryMenu(restaurantId);
  if (!menu) throw new RestaurantError("NOT_FOUND", "Create a menu first.");
  return menu;
}

async function requireCategoryOnMenu(categoryId: string, menuId: string) {
  const category = await db.orm.public.MenuCategory.where({ id: categoryId }).first();
  if (!category || category.menuId !== menuId) {
    throw new RestaurantError("NOT_FOUND", "Category not found.");
  }
  return category;
}

async function requireItemOnMenu(itemId: string, menuId: string) {
  const item = await db.orm.public.MenuItem.where({ id: itemId }).first();
  if (!item) throw new RestaurantError("NOT_FOUND", "Menu item not found.");
  const category = await db.orm.public.MenuCategory.where({ id: item.categoryId }).first();
  if (!category || category.menuId !== menuId) {
    throw new RestaurantError("NOT_FOUND", "Menu item not found.");
  }
  return { item, category };
}

async function writeAudit(
  userId: string,
  restaurantId: string,
  action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE",
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  await db.orm.public.AuditLog.create({
    userId,
    restaurantId,
    action,
    entityType,
    entityId,
    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
  });
}

export async function getMenuTree(restaurantId: string): Promise<PublicMenu | null> {
  const menu = await getPrimaryMenu(restaurantId);
  if (!menu) return null;

  const [currency, categories, promotions] = await Promise.all([
    restaurantCurrency(restaurantId),
    db.orm.public.MenuCategory.where({ menuId: menu.id }).all(),
    db.orm.public.Promotion.where({ restaurantId }).all(),
  ]);

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const itemGroups = await Promise.all(
    sortedCategories.map((category) =>
      db.orm.public.MenuItem.where({ categoryId: category.id }).all()
    )
  );

  const allItems = itemGroups.flat();
  const itemById = new Map(allItems.map((item) => [item.id, item]));
  const categoryById = new Map(sortedCategories.map((category) => [category.id, category]));

  const promotionLinks = await Promise.all(
    promotions.map((promotion) =>
      db.orm.public.PromotionItem.where({ promotionId: promotion.id }).all()
    )
  );

  const publicPromotions: PublicPromotion[] = promotions.map((promotion, index) => ({
    id: promotion.id,
    name: promotion.name,
    description: promotion.description,
    type: promotion.type,
    value: toNumber(promotion.value),
    startsAt: toIso(promotion.startsAt),
    endsAt: toIso(promotion.endsAt),
    isActive: promotion.isActive,
    isLive: isPromotionLive(promotion),
    menuItemIds: promotionLinks[index]
      .map((link) => link.menuItemId)
      .filter((id) => itemById.has(id)),
  }));

  const liveByItemId = new Map<string, string>();
  for (const promotion of publicPromotions) {
    if (!promotion.isLive) continue;
    const label = promotionLabel(promotion);
    for (const itemId of promotion.menuItemIds) {
      if (!liveByItemId.has(itemId)) liveByItemId.set(itemId, label);
    }
  }

  const publicCategories: PublicMenuCategory[] = sortedCategories.map((category, index) => {
    const items = [...itemGroups[index]].sort((a, b) => a.sortOrder - b.sortOrder);
    const publicItems: PublicMenuItem[] = items.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      categoryName: categoryById.get(item.categoryId)?.name ?? category.name,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      model3dUrl: (item as any).model3dUrl
        ? (item as any).model3dUrl.startsWith("data:")
          ? `/api/menu-items/${item.id}/3d`
          : (item as any).model3dUrl
        : null,
      price: formatPrice(String(item.price), currency),
      isAvailable: item.isAvailable,
      isFeatured: item.isFeatured,
      sortOrder: item.sortOrder,
      preparationTime: item.preparationTime,
      promotionLabel: liveByItemId.get(item.id) ?? null,
    }));

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      itemCount: publicItems.length,
      items: publicItems,
    };
  });

  return {
    id: menu.id,
    restaurantId: menu.restaurantId,
    name: menu.name,
    description: menu.description,
    isPublished: menu.isPublished,
    currency,
    categories: publicCategories,
    promotions: publicPromotions.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function createMenu(
  userId: string,
  restaurantId: string,
  input: CreateMenuBody
): Promise<PublicMenu> {
  const existing = await getPrimaryMenu(restaurantId);
  if (existing) {
    throw new RestaurantError("CONFLICT", "This restaurant already has a menu.");
  }

  const created = await db.orm.public.Menu.create({
    restaurantId,
    name: input.name,
    description: input.description ?? null,
    isPublished: false,
  });

  await writeAudit(userId, restaurantId, "CREATE", "Menu", created.id, { name: created.name });
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

export async function updateMenu(
  userId: string,
  restaurantId: string,
  input: UpdateMenuBody
): Promise<PublicMenu> {
  const menu = await requirePrimaryMenu(restaurantId);
  const action = input.isPublished !== undefined && input.isPublished !== menu.isPublished
    ? "STATUS_CHANGE"
    : "UPDATE";

  await db.orm.public.Menu.where({ id: menu.id }).update({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description ?? null } : {}),
    ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
  });

  await writeAudit(userId, restaurantId, action, "Menu", menu.id, input as Record<string, unknown>);
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

export async function createCategory(
  userId: string,
  restaurantId: string,
  input: CreateCategoryBody
): Promise<PublicMenu> {
  const menu = await requirePrimaryMenu(restaurantId);
  const existing = await db.orm.public.MenuCategory.where({ menuId: menu.id }).all();
  const created = await db.orm.public.MenuCategory.create({
    menuId: menu.id,
    name: input.name,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    sortOrder: existing.length,
    isActive: true,
  });
  await writeAudit(userId, restaurantId, "CREATE", "MenuCategory", created.id, { name: created.name });
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

export async function updateCategory(
  userId: string,
  restaurantId: string,
  categoryId: string,
  input: UpdateCategoryBody
): Promise<PublicMenu> {
  const menu = await requirePrimaryMenu(restaurantId);
  await requireCategoryOnMenu(categoryId, menu.id);
  await db.orm.public.MenuCategory.where({ id: categoryId }).update({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description ?? null } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl ?? null } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  });
  await writeAudit(userId, restaurantId, "UPDATE", "MenuCategory", categoryId);
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

export async function deleteCategory(
  userId: string,
  restaurantId: string,
  categoryId: string
): Promise<PublicMenu> {
  const menu = await requirePrimaryMenu(restaurantId);
  await requireCategoryOnMenu(categoryId, menu.id);
  await db.orm.public.MenuCategory.where({ id: categoryId }).delete();
  await writeAudit(userId, restaurantId, "DELETE", "MenuCategory", categoryId);
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

/** Moves a category one step up or down in one transaction. At the edge nothing changes. */
export async function moveCategory(
  userId: string,
  restaurantId: string,
  categoryId: string,
  direction: Direction
): Promise<PublicMenu> {
  const menu = await requirePrimaryMenu(restaurantId);
  await requireCategoryOnMenu(categoryId, menu.id);
  await db.transaction(async (tx) => {
    const siblings = await tx.orm.public.MenuCategory.where({ menuId: menu.id }).all();
    const changes = moveRow(siblings, categoryId, direction);
    if (!changes) return;
    for (const change of changes) {
      await tx.orm.public.MenuCategory.where({ id: change.id }).update({ sortOrder: change.sortOrder });
    }
    await tx.orm.public.AuditLog.create({
      userId,
      restaurantId,
      action: "UPDATE",
      entityType: "MenuCategory",
      entityId: categoryId,
      metadata: { move: direction },
    });
  });
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

/** Moves a dish one step up or down inside its category, in one transaction. */
export async function moveItem(
  userId: string,
  restaurantId: string,
  itemId: string,
  direction: Direction
): Promise<PublicMenu> {
  const menu = await requirePrimaryMenu(restaurantId);
  const { item } = await requireItemOnMenu(itemId, menu.id);
  await db.transaction(async (tx) => {
    const siblings = await tx.orm.public.MenuItem.where({ categoryId: item.categoryId }).all();
    const changes = moveRow(siblings, itemId, direction);
    if (!changes) return;
    for (const change of changes) {
      await tx.orm.public.MenuItem.where({ id: change.id }).update({ sortOrder: change.sortOrder });
    }
    await tx.orm.public.AuditLog.create({
      userId,
      restaurantId,
      action: "UPDATE",
      entityType: "MenuItem",
      entityId: itemId,
      metadata: { move: direction },
    });
  });
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

export async function createItem(
  userId: string,
  restaurantId: string,
  input: CreateItemBody
): Promise<PublicMenu> {
  const menu = await requirePrimaryMenu(restaurantId);
  await requireCategoryOnMenu(input.categoryId, menu.id);
  const siblings = await db.orm.public.MenuItem.where({ categoryId: input.categoryId }).all();
  const created = await db.orm.public.MenuItem.create({
    categoryId: input.categoryId,
    name: input.name,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    model3dUrl: (input as any).model3dUrl ?? null,
    price: await validPrice(restaurantId, input.price),
    preparationTime: input.preparationTime ?? null,
    isAvailable: input.isAvailable ?? true,
    isFeatured: input.isFeatured ?? false,
    sortOrder: siblings.length,
  });
  await writeAudit(userId, restaurantId, "CREATE", "MenuItem", created.id, { name: created.name });
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

export async function updateItem(
  userId: string,
  restaurantId: string,
  itemId: string,
  input: UpdateItemBody
): Promise<PublicMenu> {
  const menu = await requirePrimaryMenu(restaurantId);
  await requireItemOnMenu(itemId, menu.id);
  if (input.categoryId) await requireCategoryOnMenu(input.categoryId, menu.id);

  const price = input.price !== undefined ? await validPrice(restaurantId, input.price) : undefined;

  await db.orm.public.MenuItem.where({ id: itemId }).update({
    ...(price !== undefined ? { price } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description ?? null } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl ?? null } : {}),
    ...((input as any).model3dUrl !== undefined ? { model3dUrl: (input as any).model3dUrl ?? null } : {}),

    ...(input.preparationTime !== undefined ? { preparationTime: input.preparationTime } : {}),
    ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
    ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
  });
  await writeAudit(userId, restaurantId, "UPDATE", "MenuItem", itemId);
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

export async function deleteItem(
  userId: string,
  restaurantId: string,
  itemId: string
): Promise<PublicMenu> {
  const menu = await requirePrimaryMenu(restaurantId);
  await requireItemOnMenu(itemId, menu.id);
  await db.orm.public.MenuItem.where({ id: itemId }).delete();
  await writeAudit(userId, restaurantId, "DELETE", "MenuItem", itemId);
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

async function replacePromotionItems(promotionId: string, menuItemIds: string[], menuId: string) {
  const uniqueIds = [...new Set(menuItemIds)];
  for (const itemId of uniqueIds) {
    await requireItemOnMenu(itemId, menuId);
  }

  const existing = await db.orm.public.PromotionItem.where({ promotionId }).all();
  for (const link of existing) {
    await db.orm.public.PromotionItem.where({
      promotionId: link.promotionId,
      menuItemId: link.menuItemId,
    }).delete();
  }

  for (const menuItemId of uniqueIds) {
    await db.orm.public.PromotionItem.create({ promotionId, menuItemId });
  }
}

export async function createPromotion(
  userId: string,
  restaurantId: string,
  input: CreatePromotionBody
): Promise<PublicMenu> {
  const menu = await requirePrimaryMenu(restaurantId);
  const startsAt = parseInstant(input.startsAt);
  const endsAt = parseInstant(input.endsAt);
  if (Temporal.Instant.compare(endsAt, startsAt) <= 0) {
    throw new RestaurantError("VALIDATION_ERROR", "End date must be after the start date.", "endsAt");
  }

  const created = await db.orm.public.Promotion.create({
    restaurantId,
    name: input.name,
    description: input.description ?? null,
    type: input.type,
    value: String(input.value),
    startsAt,
    endsAt,
    isActive: input.isActive ?? true,
  });

  await replacePromotionItems(created.id, input.menuItemIds, menu.id);
  await writeAudit(userId, restaurantId, "CREATE", "Promotion", created.id, { name: created.name });
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

export async function updatePromotion(
  userId: string,
  restaurantId: string,
  promotionId: string,
  input: UpdatePromotionBody
): Promise<PublicMenu> {
  const menu = await requirePrimaryMenu(restaurantId);
  const promotion = await db.orm.public.Promotion.where({ id: promotionId }).first();
  if (!promotion || promotion.restaurantId !== restaurantId) {
    throw new RestaurantError("NOT_FOUND", "Promotion not found.");
  }

  const startsAt = input.startsAt ? parseInstant(input.startsAt) : promotion.startsAt;
  const endsAt = input.endsAt ? parseInstant(input.endsAt) : promotion.endsAt;
  if (Temporal.Instant.compare(endsAt as Temporal.Instant, startsAt as Temporal.Instant) <= 0) {
    throw new RestaurantError("VALIDATION_ERROR", "End date must be after the start date.", "endsAt");
  }

  await db.orm.public.Promotion.where({ id: promotionId }).update({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description ?? null } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.value !== undefined ? { value: String(input.value) } : {}),
    ...(input.startsAt !== undefined ? { startsAt } : {}),
    ...(input.endsAt !== undefined ? { endsAt } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  });

  if (input.menuItemIds) {
    await replacePromotionItems(promotionId, input.menuItemIds, menu.id);
  }

  await writeAudit(userId, restaurantId, "UPDATE", "Promotion", promotionId);
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

export async function deletePromotion(
  userId: string,
  restaurantId: string,
  promotionId: string
): Promise<PublicMenu> {
  const promotion = await db.orm.public.Promotion.where({ id: promotionId }).first();
  if (!promotion || promotion.restaurantId !== restaurantId) {
    throw new RestaurantError("NOT_FOUND", "Promotion not found.");
  }
  await db.orm.public.Promotion.where({ id: promotionId }).delete();
  await writeAudit(userId, restaurantId, "DELETE", "Promotion", promotionId);
  const tree = await getMenuTree(restaurantId);
  if (!tree) throw new RestaurantError("INTERNAL_ERROR");
  return tree;
}

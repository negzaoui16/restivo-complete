"use client";

import { Minus, Plus, Star } from "lucide-react";
import { MAX_LINE_QUANTITY } from "@/lib/orders/constants";
import type { Cart } from "@/lib/orders/cart";
import type { DiscoverMenu, MenuItemView } from "@/lib/orders/types";
import { parseDescriptionTags, getTagById } from "@/lib/menu/tags";

/**
 * The menu as a plain scrolling list. It is the accessible "View as list" form
 * of the menu; `onChange` makes the + / − steppers appear.
 */
export function MenuList({
  menu,
  currency,
  cart,
  onChange,
  onOpenAR,
}: {
  menu: NonNullable<DiscoverMenu["menu"]>;
  currency: string;
  cart: Cart;
  onChange?: (menuItemId: string, delta: number) => void;
  onOpenAR?: (item: MenuItemView) => void;
}) {
  return (
    <div className="space-y-5">
      {menu.categories.map((category) => (
        <section key={category.id} aria-labelledby={`cat-${category.id}`}>
          <h3 id={`cat-${category.id}`} className="mb-2 text-sm font-bold text-[#1A1A1A]">
            {category.name}
          </h3>
          <ul className="divide-y divide-[#F2ECE4] rounded-2xl border border-[#E8E2D7] bg-white">
            {category.items.map((item) => {
              const quantity = cart[item.id] ?? 0;
              const discounted = item.salePrice !== item.price;
              const { text: cleanDescription, tags } = parseDescriptionTags(item.description, item.name);
              return (
                <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-sm font-semibold ${item.isAvailable ? "text-[#1A1A1A]" : "text-[#9E988F]"}`}>
                        {item.name}
                      </span>
                      {item.isFeatured && item.isAvailable ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#EEF2E8] px-2 py-0.5 text-[10px] font-semibold text-[#55664A]">
                          <Star className="h-2.5 w-2.5" aria-hidden="true" />
                          Featured
                        </span>
                      ) : null}
                      {!item.isAvailable ? (
                        <span className="rounded-full bg-[#F1EEE8] px-2 py-0.5 text-[10px] font-semibold text-[#6B6661]">
                          Unavailable
                        </span>
                      ) : null}
                      {item.isAvailable && item.promotionLabel ? (
                        <span className="rounded-full bg-[#FBEAE5] px-2 py-0.5 text-[10px] font-semibold text-[#B55234]">
                          {item.promotionLabel}
                        </span>
                      ) : null}
                      {item.model3dUrl ? (
                        <button
                          type="button"
                          onClick={() => onOpenAR?.(item)}
                          className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 active:scale-95 transition-all cursor-pointer"
                        >
                          <span>📱</span>
                          <span>3D / AR</span>
                        </button>
                      ) : null}
                    </div>

                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.map((tagId) => {
                          const def = getTagById(tagId);
                          if (!def) return null;
                          return (
                            <span
                              key={tagId}
                              className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.2 text-[9px] font-semibold ${def.colorClass}`}
                            >
                              <span>{def.icon}</span>
                              <span>{def.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : null}

                    {cleanDescription ? <p className="mt-0.5 text-xs text-[#736D65]">{cleanDescription}</p> : null}
                    <p className="mt-1 text-xs text-[#524D48]">
                      {discounted && item.isAvailable ? (
                        <>
                          <span className="mr-1.5 text-[#9E988F] line-through">{item.price}</span>
                          <span className="font-semibold">{item.salePrice}</span>
                        </>
                      ) : (
                        <span className="font-semibold">{item.price}</span>
                      )}{" "}
                      {currency}
                    </p>
                  </div>

                  {onChange && item.isAvailable ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Remove one ${item.name}`}
                        disabled={quantity === 0}
                        onClick={() => onChange(item.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D8D2C5] text-[#423E3A] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#B55234] disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one ${item.name}`}
                        disabled={quantity >= MAX_LINE_QUANTITY}
                        onClick={() => onChange(item.id, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B55234] text-white hover:bg-[#9E4328] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234] disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

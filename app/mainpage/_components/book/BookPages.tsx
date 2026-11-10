"use client";

import { useState } from "react";
import { Minus, Plus, Star, UtensilsCrossed } from "lucide-react";
import type { BookPage } from "@/lib/menu-book/paginate";
import type { Cart, CartLine, estimateCart } from "@/lib/orders/cart";
import { MAX_LINE_QUANTITY } from "@/lib/orders/constants";
import type { MenuCategoryView, MenuItemView } from "@/lib/orders/types";
import { parseDescriptionTags, getTagById } from "@/lib/menu/tags";

export type BookContext = {
  restaurantName: string;
  menuName: string;
  currency: string;
  categories: Map<string, MenuCategoryView>;
  pages: BookPage<MenuItemView>[];
  /** When false the + / − buttons are disabled and `orderHint` explains why. */
  canOrder: boolean;
  orderHint: string;
  cart: Cart;
  onChange?: (menuItemId: string, delta: number) => void;
  /** Dishes of the cart that are still orderable, with the estimate shown on the order page. */
  lines: CartLine[];
  estimate: ReturnType<typeof estimateCart>;
  /** Reservation facts shown on the order page (table, date...). */
  summary: string[];
  /** Why the order cannot go through (a dish became unavailable, the table was lost...). */
  notice: string | null;
  onContinue?: () => void;
  goToPage: (pageIndex: number) => void;
  onClose?: () => void;
  onOpenAR?: (item: MenuItemView) => void;
};

const display = "font-[family-name:var(--font-display)]";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234]";

/** Ivory paper with a faint grain and a soft shadow towards the spine. */
export function Paper({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#FBF7EE] text-[#2B2622]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(120,100,70,0.035) 0px, rgba(120,100,70,0.035) 1px, transparent 1px, transparent 3px)",
      }}
    >
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-[14%]"
        style={{
          ...(side === "right" ? { left: 0 } : { right: 0 }),
          backgroundImage: `linear-gradient(${side === "right" ? "to right" : "to left"}, rgba(60,40,20,0.16), rgba(60,40,20,0.04) 45%, transparent)`,
        }}
      />
    </div>
  );
}

function Ornament() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-2 text-[#B55234]">
      <span className="h-px w-10 bg-current opacity-50" />
      <UtensilsCrossed className="h-4 w-4" />
      <span className="h-px w-10 bg-current opacity-50" />
    </div>
  );
}

function DishImage({ src, name, dimmed }: { src: string | null; name: string; dimmed: boolean }) {
  const [state, setState] = useState<"loading" | "ok" | "error">(src ? "loading" : "error");
  return (
    <div className="absolute inset-0 bg-[#EFE7D6]">
      {state !== "error" && src ? (
        // Dish photos come from arbitrary hosts, so next/image cannot optimise them.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
          className={`h-full w-full object-cover transition-opacity duration-300 ${state === "ok" ? "opacity-100" : "opacity-0"} ${dimmed ? "grayscale" : ""}`}
        />
      ) : null}
      {state === "loading" ? <div className="absolute inset-0 animate-pulse bg-[#E8DFCB]" aria-hidden="true" /> : null}
      {state === "error" ? (
        <div
          role="img"
          aria-label={`No photo for ${name}`}
          className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#B55234]"
          style={{ backgroundImage: "radial-gradient(circle at 30% 20%, #F6EEDD, #E7DBC2)" }}
        >
          <span className={`${display} text-5xl leading-none opacity-40`}>{name.trim().charAt(0).toUpperCase()}</span>
          <UtensilsCrossed className="h-4 w-4 opacity-40" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}

function Stepper({ item, ctx }: { item: MenuItemView; ctx: BookContext }) {
  const quantity = ctx.cart[item.id] ?? 0;
  const enabled = ctx.canOrder && item.isAvailable;
  return (
    <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label={`Quantity of ${item.name}`}>
      <button
        type="button"
        aria-label={`Remove one ${item.name}`}
        disabled={!enabled || quantity === 0}
        onClick={() => ctx.onChange?.(item.id, -1)}
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-[#CDBF9F] text-[#423E3A] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span className="w-5 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        aria-label={`Add one ${item.name}`}
        disabled={!enabled || quantity >= MAX_LINE_QUANTITY}
        onClick={() => ctx.onChange?.(item.id, 1)}
        className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#B55234] text-white hover:bg-[#9E4328] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function Dish({ item, ctx }: { item: MenuItemView; ctx: BookContext }) {
  const quantity = ctx.cart[item.id] ?? 0;
  const discounted = item.isAvailable && item.salePrice !== item.price;
  const { text: cleanDescription, tags } = parseDescriptionTags(item.description, item.name);

  return (
    <article className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="relative min-h-0 flex-[3] overflow-hidden rounded-sm border border-[#D9CDB5] shadow-sm group">
        <DishImage key={item.imageUrl ?? item.id} src={item.imageUrl} name={item.name} dimmed={!item.isAvailable} />
        {item.isFeatured && item.isAvailable ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#55664A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            <Star className="h-2.5 w-2.5" aria-hidden="true" />
            Featured
          </span>
        ) : null}
        {discounted && item.promotionLabel ? (
          <span className="absolute right-2 top-2 rounded-full bg-[#B55234] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            {item.promotionLabel}
          </span>
        ) : null}
        {!item.isAvailable ? (
          <span className="absolute inset-x-0 bottom-0 bg-[#2B2622]/70 py-1 text-center text-[11px] font-semibold uppercase tracking-widest text-white">
            Unavailable
          </span>
        ) : null}
        {item.model3dUrl ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ctx.onOpenAR?.(item);
            }}
            className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg hover:from-purple-700 hover:to-indigo-700 active:scale-95 transition-all cursor-pointer border border-white/40"
          >
            <span>📱</span>
            <span>Voir en 3D / AR</span>
          </button>
        ) : null}
        {quantity > 0 ? (
          <span
            className="absolute bottom-2 right-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#55664A] px-1.5 text-xs font-bold text-white shadow"
            aria-label={`${quantity} in your order`}
          >
            {quantity}
          </span>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-[2] flex-col gap-1">
        <h3 className={`${display} text-lg font-semibold leading-tight sm:text-xl ${item.isAvailable ? "" : "text-[#6B6661]"}`}>
          {item.name}
        </h3>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 my-0.5">
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
        {cleanDescription ? (
          <p className="min-h-0 flex-1 overflow-y-auto text-xs leading-relaxed text-[#5A544D]">{cleanDescription}</p>
        ) : (
          <span className="flex-1" />
        )}
        <div className="flex items-center justify-between gap-2 border-t border-[#D9CDB5] pt-1.5">
          <p className="text-sm tabular-nums">
            {discounted ? <span className="mr-1.5 text-[#6B6661] line-through">{item.price}</span> : null}
            <span className={`font-bold ${item.isAvailable ? "text-[#2B2622]" : "text-[#6B6661]"}`}>
              {item.isAvailable ? item.salePrice : item.price}
            </span>{" "}
            <span className="text-xs text-[#6B6661]">{ctx.currency}</span>
          </p>
          {item.isAvailable ? <Stepper item={item} ctx={ctx} /> : null}
        </div>
      </div>
    </article>
  );
}

function Footer({ ctx, pageIndex }: { ctx: BookContext; pageIndex: number }) {
  return (
    <p className="mt-2 flex items-center justify-between border-t border-[#D9CDB5] pt-1.5 text-[10px] uppercase tracking-widest text-[#6B6661]">
      <span>{ctx.restaurantName}</span>
      <span className={`${display} text-xs normal-case tracking-normal`}>{pageIndex + 1}</span>
    </p>
  );
}

/** One page of the book, from its model. `side` only decides on which edge the spine shadow falls. */
export function PageFace({
  page,
  pageIndex,
  side,
  ctx,
}: {
  page: BookPage<MenuItemView> | null;
  pageIndex: number;
  side: "left" | "right";
  ctx: BookContext;
}) {
  if (!page) return <div className="h-full w-full" aria-hidden="true" />;

  if (page.kind === "cover") {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden px-8 text-center text-[#F8F6EF]"
        style={{ backgroundImage: "linear-gradient(135deg, #B55234, #8E3C22 70%, #6F2E1A)" }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-sm border border-[#F8F6EF]/40" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-5 rounded-sm border border-[#F8F6EF]/20" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#F8F6EF]/80">The menu</p>
        <h2 className={`${display} text-3xl font-semibold leading-tight sm:text-4xl`}>{ctx.restaurantName}</h2>
        <div className="text-[#F8F6EF]/80">
          <Ornament />
        </div>
        <p className="text-xs tracking-wide text-[#F8F6EF]/85">{ctx.menuName}</p>
        <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-[#F8F6EF]/70">Turn the page</p>
      </div>
    );
  }

  return (
    <Paper side={side}>
      <div className="flex h-full flex-col px-[9%] py-[7%]">
        {page.kind === "contents" ? (
          <>
            <h2 className={`${display} text-2xl font-semibold sm:text-3xl`}>Contents</h2>
            <div className="my-3">
              <Ornament />
            </div>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {ctx.pages.map((entry, index) =>
                entry.kind === "chapter" ? (
                  <li key={entry.categoryId}>
                    <button
                      type="button"
                      onClick={() => ctx.goToPage(index)}
                      className={`flex w-full items-baseline gap-2 rounded px-1 py-1.5 text-left hover:bg-[#B55234]/10 ${focusRing}`}
                    >
                      <span className={`${display} text-base`}>{ctx.categories.get(entry.categoryId)?.name}</span>
                      <span aria-hidden="true" className="flex-1 translate-y-[-3px] border-b border-dotted border-[#B8AA8A]" />
                      <span className="text-xs tabular-nums text-[#6B6661]">{index + 1}</span>
                    </button>
                  </li>
                ) : null,
              )}
            </ul>
          </>
        ) : null}

        {page.kind === "chapter" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#B55234]">
              {ctx.categories.get(page.categoryId)?.items.length ?? 0} dishes
            </p>
            <h2 className={`${display} text-4xl font-semibold leading-tight sm:text-5xl`}>
              {ctx.categories.get(page.categoryId)?.name}
            </h2>
            <Ornament />
            {ctx.categories.get(page.categoryId)?.description ? (
              <p className="max-w-[28ch] text-sm italic leading-relaxed text-[#5A544D]">
                {ctx.categories.get(page.categoryId)?.description}
              </p>
            ) : null}
          </div>
        ) : null}

        {page.kind === "dishes" ? (
          <>
            <p className="mb-2 flex items-baseline justify-between text-[11px] uppercase tracking-[0.3em] text-[#B55234]">
              <span>{ctx.categories.get(page.categoryId)?.name}</span>
              {page.parts > 1 ? (
                <span className="tracking-normal text-[#6B6661]">
                  {page.part}/{page.parts}
                </span>
              ) : null}
            </p>
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              {page.items.map((item) => (
                <Dish key={item.id} item={item} ctx={ctx} />
              ))}
            </div>
            {!ctx.canOrder ? <p className="mt-2 text-center text-[11px] italic text-[#6B6661]">{ctx.orderHint}</p> : null}
          </>
        ) : null}

        {page.kind === "order" ? (
          <>
            <h2 className={`${display} text-2xl font-semibold sm:text-3xl`}>Your order</h2>
            <div className="my-2">
              <Ornament />
            </div>
            {ctx.summary.length > 0 ? (
              <ul className="mb-2 space-y-0.5 text-center text-[11px] text-[#5A544D]">
                {ctx.summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {ctx.notice ? (
              <p className="mb-2 rounded-sm bg-[#FBEAE5] px-2 py-1.5 text-xs font-medium text-[#8E3C22]" role="alert">
                {ctx.notice}
              </p>
            ) : null}
            {ctx.lines.length === 0 ? (
              <p className="flex-1 pt-6 text-center text-sm italic text-[#5A544D]">
                Nothing yet. Turn back and add dishes with the + buttons.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {ctx.lines.map(({ item, quantity }) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 border-b border-dotted border-[#CDBF9F] pb-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="text-[11px] tabular-nums text-[#5A544D]">
                        {quantity} x {item.salePrice} {ctx.currency}
                        {item.promotionLabel ? <span className="ml-1 text-[#B55234]">{item.promotionLabel}</span> : null}
                      </p>
                    </div>
                    <Stepper item={item} ctx={ctx} />
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-2 space-y-0.5 border-t border-[#D9CDB5] pt-2 text-xs">
              {ctx.estimate.hasDiscount ? (
                <>
                  <div className="flex justify-between text-[#5A544D]">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">
                      {ctx.estimate.subtotal} {ctx.currency}
                    </dd>
                  </div>
                  <div className="flex justify-between text-[#B55234]">
                    <dt>Promotions</dt>
                    <dd className="tabular-nums">
                      -{ctx.estimate.discount} {ctx.currency}
                    </dd>
                  </div>
                </>
              ) : null}
              <div className="flex justify-between text-sm font-bold">
                <dt>Estimated total</dt>
                <dd className="tabular-nums">
                  {ctx.estimate.total} {ctx.currency}
                </dd>
              </div>
            </dl>
            <p className="mt-1 text-[10px] text-[#6B6661]">The final price is calculated by the restaurant when you confirm.</p>
            <button
              type="button"
              disabled={ctx.lines.length === 0 || !ctx.onContinue}
              onClick={ctx.onContinue}
              className={`mt-2 rounded-full bg-[#B55234] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#9E4328] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
            >
              Review and confirm
            </button>
          </>
        ) : null}

        {page.kind === "end" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <h2 className={`${display} text-3xl font-semibold sm:text-4xl`}>Bon appétit</h2>
            <Ornament />
            <p className="max-w-[26ch] text-sm leading-relaxed text-[#5A544D]">
              Thank you for reading the menu of {ctx.restaurantName}.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => ctx.goToPage(0)}
                className={`rounded-full border border-[#CDBF9F] px-4 py-2 text-xs font-semibold text-[#423E3A] hover:bg-black/5 ${focusRing}`}
              >
                Back to the cover
              </button>
              {ctx.onClose ? (
                <button
                  type="button"
                  onClick={ctx.onClose}
                  className={`rounded-full bg-[#B55234] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9E4328] ${focusRing}`}
                >
                  Close the book
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {page.kind !== "chapter" && page.kind !== "end" ? <Footer ctx={ctx} pageIndex={pageIndex} /> : null}
      </div>
    </Paper>
  );
}

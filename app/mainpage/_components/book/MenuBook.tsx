"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import {
  anchorOf,
  chapterIndex,
  findAnchor,
  firstPageOfSpread,
  paginate,
  spreadCount,
  spreadOfPage,
  spreadPages,
  type Anchor,
} from "@/lib/menu-book/paginate";
import { cartLines, estimateCart, type Cart } from "@/lib/orders/cart";
import type { DiscoverMenu, MenuItemView } from "@/lib/orders/types";
import { PageFace, type BookContext } from "./BookPages";
import { useMediaQuery } from "./useMediaQuery";

/** browse: read only. order: + / − are live. manager-preview: read only, as a customer would see it. */
export type MenuBookMode = "browse" | "order" | "manager-preview";

export const FLIP_MS = 650;
const EASE = "cubic-bezier(0.45, 0.05, 0.25, 1)";
const SWIPE_PX = 50;

type Anim = { dir: "next" | "prev"; target: number; go: boolean };

/**
 * The menu as a 2D book: cover, contents, one chapter per category with its dish
 * pages. Two pages side by side on wide screens, one page on narrow ones. The
 * page turn is plain CSS 3D (no library) and falls back to an instant change
 * when the visitor prefers reduced motion.
 */
export function MenuBook({
  menu,
  currency,
  decimals,
  restaurantName,
  mode = "browse",
  cart = {},
  onChange,
  orderHint = "Choose a table to order.",
  summary = [],
  notice = null,
  startOn = "cover",
  onContinue,
  onClose,
  onOpenAR,
}: {
  menu: NonNullable<DiscoverMenu["menu"]>;
  currency: string;
  decimals: number;
  restaurantName: string;
  mode?: MenuBookMode;
  cart?: Cart;
  onChange?: (menuItemId: string, delta: number) => void;
  orderHint?: string;
  /** Reservation facts for the "Your order" page. */
  summary?: string[];
  notice?: string | null;
  /** Page to open on; "order" jumps to the last page. */
  startOn?: "cover" | "order";
  /** Called by "Review and confirm" on the order page. */
  onContinue?: () => void;
  onClose?: () => void;
  onOpenAR?: (item: MenuItemView) => void;
}) {
  const double = useMediaQuery("(min-width: 820px)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  const pages = useMemo(() => paginate<MenuItemView>(menu.categories, double ? 2 : 1, mode === "order"), [menu.categories, double, mode]);
  const categories = useMemo(() => new Map(menu.categories.map((category) => [category.id, category])), [menu.categories]);

  // The reader's place is an anchor, so a resize or a change of layout keeps them on the same chapter or dish.
  const [anchor, setAnchor] = useState<Anchor>({ kind: startOn });
  const [anim, setAnim] = useState<Anim | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStart = useRef<number | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const count = spreadCount(pages.length, double);
  const pageIndex = findAnchor(pages, anchor);
  const current = Math.min(spreadOfPage(pageIndex, double), count - 1);

  useEffect(() => {
    root.current?.focus({ preventScroll: true });
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const goToSpread = useCallback(
    (target: number) => {
      if (anim || target === current || target < 0 || target >= count) return;
      const commit = () => {
        setAnchor(anchorOf(pages[firstPageOfSpread(target, pages.length, double)]));
        setAnim(null);
      };
      if (reduced) {
        commit();
        return;
      }
      setAnim({ dir: target > current ? "next" : "prev", target, go: false });
      // Two frames: mount the leaf at its start angle, then let the transition run.
      requestAnimationFrame(() => requestAnimationFrame(() => setAnim((a) => (a ? { ...a, go: true } : a))));
      timer.current = setTimeout(commit, FLIP_MS + 30);
    },
    [anim, current, count, pages, double, reduced],
  );

  const goToPage = useCallback((index: number) => goToSpread(spreadOfPage(index, double)), [goToSpread, double]);

  const lines = useMemo(() => cartLines(menu, cart), [menu, cart]);
  const estimate = useMemo(() => estimateCart(lines, decimals), [lines, decimals]);

  const ctx: BookContext = {
    restaurantName,
    menuName: menu.name,
    currency,
    categories,
    pages,
    canOrder: mode === "order",
    orderHint,
    cart,
    onChange,
    lines,
    estimate,
    summary,
    notice,
    onContinue,
    goToPage,
    onClose,
    onOpenAR,
  };

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight" || event.key === "PageDown") goToSpread(current + 1);
    else if (event.key === "ArrowLeft" || event.key === "PageUp") goToSpread(current - 1);
    else if (event.key === "Home") goToSpread(0);
    else if (event.key === "End") goToSpread(count - 1);
    else if (event.key === "Escape") onClose?.();
    else return;
    event.preventDefault();
  }

  function face(index: number | null, side: "left" | "right") {
    return <PageFace page={index === null ? null : pages[index]} pageIndex={index ?? 0} side={side} ctx={ctx} />;
  }

  // What the two halves show right now. During a turn the halves show the pages being revealed.
  const from = spreadPages(current, pages.length, double);
  const to = anim ? spreadPages(anim.target, pages.length, double) : from;
  const base = !anim ? from : anim.dir === "next" ? { left: from.left, right: to.right } : { left: to.left, right: from.right };

  const currentPage = pages[pageIndex];
  const chapterName =
    currentPage && "categoryId" in currentPage ? categories.get(currentPage.categoryId)?.name : undefined;
  const announcement = `Page ${pageIndex + 1} of ${pages.length}${chapterName ? `, ${chapterName}` : ""}`;

  const transition = `transform ${FLIP_MS}ms ${EASE}, opacity ${FLIP_MS}ms ${EASE}`;
  const turn = (() => {
    if (!anim) return null;
    // Double: a leaf on the right half turns about the spine through 180°. Single: the page folds away.
    const open = double ? "rotateY(-180deg)" : "rotateY(-105deg)";
    const closed = "rotateY(0deg)";
    const start = anim.dir === "next" ? closed : open;
    const end = anim.dir === "next" ? open : closed;
    const front = anim.dir === "next" ? from.right : to.right;
    const back = anim.dir === "next" ? to.left : from.left;
    return { transform: anim.go ? end : start, front, back };
  })();

  const tabs = menu.categories.length > 1 ? menu.categories : [];

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full items-stretch justify-center gap-2 md:gap-0">
        <div
          ref={root}
          tabIndex={0}
          role="region"
          aria-roledescription="book"
          aria-label={`${restaurantName} menu`}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => {
            swipeStart.current = event.clientX;
          }}
          onPointerUp={(event) => {
            const start = swipeStart.current;
            swipeStart.current = null;
            if (start === null) return;
            const dx = event.clientX - start;
            if (dx <= -SWIPE_PX) goToSpread(current + 1);
            else if (dx >= SWIPE_PX) goToSpread(current - 1);
          }}
          className="relative touch-pan-y select-none rounded-sm shadow-[0_18px_40px_-12px_rgba(43,33,27,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-[#B55234] focus-visible:ring-offset-2"
          style={{
            perspective: "2400px",
            aspectRatio: double ? "3 / 2" : "3 / 4",
            width: double ? "min(100%, calc(76dvh * 1.5))" : "min(100%, calc(72dvh * 0.75))",
          }}
        >
          <div className="absolute inset-0 flex">
            {double ? <div className="h-full w-1/2">{face(base.left, "left")}</div> : null}
            <div className={`h-full ${double ? "w-1/2" : "w-full"}`}>{face(base.right, "right")}</div>
          </div>

          {double ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 w-3 -translate-x-1/2"
              style={{ backgroundImage: "linear-gradient(to right, transparent, rgba(60,40,20,0.22), transparent)" }}
            />
          ) : null}

          {anim && turn ? (
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-y-0 right-0 ${double ? "w-1/2" : "w-full"}`}
              style={{ transformStyle: "preserve-3d", transformOrigin: "left center", transform: turn.transform, transition }}
            >
              <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                {face(turn.front, "right")}
                <div
                  className="absolute inset-0 bg-black"
                  style={{ opacity: anim.go === (anim.dir === "next") ? 0.28 : 0, transition }}
                />
              </div>
              {double ? (
                <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                  {face(turn.back, "left")}
                  <div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: anim.go === (anim.dir === "next") ? 0 : 0.28, transition }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Click or tap on the outer edges to turn the page. The buttons below do the same for keyboards. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => goToSpread(current - 1)}
            className="absolute inset-y-0 left-0 z-10 w-[5%] cursor-w-resize"
          />
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => goToSpread(current + 1)}
            className="absolute inset-y-0 right-0 z-10 w-[5%] cursor-e-resize"
          />
        </div>

        {tabs.length > 0 ? (
          <nav
            aria-label="Menu sections"
            className="hidden flex-col justify-center gap-1.5 self-center md:flex"
            style={{ marginLeft: "-2px" }}
          >
            {tabs.map((category, index) => {
              const target = chapterIndex(pages, category.id);
              const active = chapterName === category.name;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => goToPage(target)}
                  aria-current={active ? "true" : undefined}
                  className={`max-w-32 truncate rounded-r-md px-3 py-2 text-left text-xs font-semibold text-white shadow-md transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234] ${
                    index % 2 === 0 ? "bg-[#B55234]" : "bg-[#55664A]"
                  } ${active ? "translate-x-1.5" : "hover:translate-x-1"}`}
                >
                  {category.name}
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>

      {tabs.length > 0 ? (
        <nav aria-label="Menu sections" className="flex w-full gap-1.5 overflow-x-auto pb-1 md:hidden">
          {tabs.map((category) => {
            const active = chapterName === category.name;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => goToPage(chapterIndex(pages, category.id))}
                aria-current={active ? "true" : undefined}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234] ${
                  active ? "bg-[#B55234] text-white" : "border border-[#CDBF9F] bg-[#FBF7EE] text-[#423E3A]"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </nav>
      ) : null}

      {mode === "order" ? (
        <button
          type="button"
          onClick={() => goToPage(pages.length - 1)}
          className="inline-flex items-center gap-2 rounded-full bg-[#55664A] px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-[#46563D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {estimate.count === 0 ? (
            "Your order is empty"
          ) : (
            <>
              Your order - {estimate.count} {estimate.count === 1 ? "dish" : "dishes"} - {estimate.total} {currency}
            </>
          )}
        </button>
      ) : null}

      <div className="flex items-center gap-3 text-[#F8F6EF]">
        <button
          type="button"
          onClick={() => goToSpread(current - 1)}
          disabled={current === 0 || anim !== null}
          aria-label="Previous page"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F8F6EF]/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="min-w-28 text-center text-xs tabular-nums">
          Page {pageIndex + 1} of {pages.length}
        </span>
        <button
          type="button"
          onClick={() => goToSpread(current + 1)}
          disabled={current >= count - 1 || anim !== null}
          aria-label="Next page"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F8F6EF]/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

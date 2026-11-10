"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, List, X } from "lucide-react";
import type { Cart } from "@/lib/orders/cart";
import type { DiscoverMenu } from "@/lib/orders/types";
import { MenuList } from "../MenuList";
import { MenuBook, type MenuBookMode } from "./MenuBook";

/**
 * Full-screen reading view of the menu: the book, or the same menu as a plain
 * scrolling list ("View as list") for people who prefer or cannot use the book.
 * Escape or the close button leaves it and returns focus to where it came from.
 */
export function MenuBookDialog({
  menu,
  currency,
  decimals,
  restaurantName,
  mode,
  cart,
  onChange,
  orderHint,
  summary,
  notice,
  startOn,
  onContinue,
  onClose,
  onOpenAR,
}: {
  menu: NonNullable<DiscoverMenu["menu"]>;
  currency: string;
  decimals: number;
  restaurantName: string;
  mode: MenuBookMode;
  cart?: Cart;
  onChange?: (menuItemId: string, delta: number) => void;
  orderHint?: string;
  summary?: string[];
  notice?: string | null;
  startOn?: "cover" | "order";
  onContinue?: () => void;
  onClose: () => void;
  onOpenAR?: (item: MenuItemView) => void;
}) {
  const [view, setView] = useState<"book" | "list">("book");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${restaurantName} menu`}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#2B211B]/95 backdrop-blur-sm"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 text-[#F8F6EF]">
        <p className="truncate font-[family-name:var(--font-display)] text-lg font-semibold">{restaurantName}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView(view === "book" ? "list" : "book")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#F8F6EF]/40 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {view === "book" ? <List className="h-3.5 w-3.5" aria-hidden="true" /> : <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />}
            {view === "book" ? "View as list" : "View as book"}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close the menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F8F6EF]/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {notice ? (
        <p className="mx-4 mb-3 rounded-lg bg-[#FBEAE5] px-3 py-2 text-xs font-medium text-[#8E3C22]" role="alert">
          {notice}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 pb-6">
        {view === "book" ? (
          <MenuBook
            menu={menu}
            currency={currency}
            decimals={decimals}
            restaurantName={restaurantName}
            mode={mode}
            cart={cart}
            onChange={onChange}
            orderHint={orderHint}
            summary={summary}
            startOn={startOn}
            onContinue={onContinue}
            onClose={onClose}
            onOpenAR={onOpenAR}
          />
        ) : (
          <div className="w-full max-w-2xl rounded-2xl bg-[#FBF7EE] p-4">
            <MenuList menu={menu} currency={currency} cart={cart ?? {}} onChange={mode === "order" ? onChange : undefined} onOpenAR={onOpenAR} />
            {mode === "order" && onContinue ? (
              <button
                type="button"
                onClick={onContinue}
                className="mt-4 w-full rounded-full bg-[#B55234] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#9E4328] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234]"
              >
                Review and confirm
              </button>
            ) : null}
            {mode !== "order" ? <p className="mt-3 text-center text-xs italic text-[#6B6661]">{orderHint}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

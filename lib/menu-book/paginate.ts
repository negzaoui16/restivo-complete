/**
 * Pure page model of the menu book: which pages exist, what is on each, and how
 * pages group into spreads. No React and no imports, so it is unit tested.
 *
 * The page list depends on `perPage` (dishes per page), which changes between
 * the one-page mobile layout and the two-page desktop layout. A reader's place
 * is therefore kept as an {@link Anchor} (what they are looking at), not as an
 * index, so a resize lands on the same chapter or dish.
 */

export type BookCategory<T> = {
  id: string;
  name: string;
  description: string | null;
  items: T[];
};

export type BookPage<T> =
  | { kind: "cover" }
  | { kind: "contents" }
  | { kind: "chapter"; categoryId: string }
  | { kind: "dishes"; categoryId: string; items: T[]; part: number; parts: number }
  | { kind: "order" }
  | { kind: "end" };

export type Anchor = { kind: BookPage<unknown>["kind"]; categoryId?: string; itemId?: string };

/**
 * Cover, contents, then per category a chapter page and its dish pages. The last
 * page is "Your order" when the book is used to order, otherwise the closing page.
 */
export function paginate<T extends { id: string }>(
  categories: BookCategory<T>[],
  perPage: number,
  withOrder = false,
): BookPage<T>[] {
  const size = Math.max(1, Math.floor(perPage));
  const pages: BookPage<T>[] = [{ kind: "cover" }, { kind: "contents" }];
  for (const category of categories) {
    if (category.items.length === 0) continue;
    pages.push({ kind: "chapter", categoryId: category.id });
    const parts = Math.ceil(category.items.length / size);
    for (let part = 0; part < parts; part += 1) {
      pages.push({
        kind: "dishes",
        categoryId: category.id,
        items: category.items.slice(part * size, (part + 1) * size),
        part: part + 1,
        parts,
      });
    }
  }
  pages.push({ kind: withOrder ? "order" : "end" });
  return pages;
}

export function anchorOf<T extends { id: string }>(page: BookPage<T>): Anchor {
  if (page.kind === "chapter") return { kind: "chapter", categoryId: page.categoryId };
  if (page.kind === "dishes") return { kind: "dishes", categoryId: page.categoryId, itemId: page.items[0]?.id };
  return { kind: page.kind };
}

/** Index of the page showing the anchor; falls back to its chapter, then to the cover. */
export function findAnchor<T extends { id: string }>(pages: BookPage<T>[], anchor: Anchor): number {
  const exact = pages.findIndex((page) => {
    if (page.kind !== anchor.kind) return false;
    if (page.kind === "chapter") return page.categoryId === anchor.categoryId;
    if (page.kind === "dishes") return page.items.some((item) => item.id === anchor.itemId);
    return true;
  });
  if (exact >= 0) return exact;
  if (anchor.categoryId) {
    const chapter = pages.findIndex((page) => page.kind === "chapter" && page.categoryId === anchor.categoryId);
    if (chapter >= 0) return chapter;
  }
  return 0;
}

export function chapterIndex<T extends { id: string }>(pages: BookPage<T>[], categoryId: string): number {
  return pages.findIndex((page) => page.kind === "chapter" && page.categoryId === categoryId);
}

/**
 * Two-page layout: the cover is alone on the right, then pages pair up as
 * (1,2), (3,4)… A spread holds a left and a right page index, or null.
 */
export function spreadCount(pageCount: number, double: boolean): number {
  return double ? Math.ceil((pageCount + 1) / 2) : pageCount;
}

export function spreadOfPage(pageIndex: number, double: boolean): number {
  return double ? Math.ceil(pageIndex / 2) : pageIndex;
}

export function spreadPages(spread: number, pageCount: number, double: boolean): { left: number | null; right: number | null } {
  if (!double) return { left: null, right: spread < pageCount ? spread : null };
  const left = spread === 0 ? null : 2 * spread - 1;
  const right = 2 * spread;
  return { left: left !== null && left < pageCount ? left : null, right: right < pageCount ? right : null };
}

/** First page of a spread, used as the reader's anchor. */
export function firstPageOfSpread(spread: number, pageCount: number, double: boolean): number {
  const { left, right } = spreadPages(spread, pageCount, double);
  return left ?? right ?? 0;
}

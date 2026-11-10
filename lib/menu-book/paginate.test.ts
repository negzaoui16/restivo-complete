import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  anchorOf,
  chapterIndex,
  findAnchor,
  firstPageOfSpread,
  paginate,
  spreadCount,
  spreadOfPage,
  spreadPages,
} from "./paginate.ts";

const item = (id: string) => ({ id });
const categories = [
  { id: "starters", name: "Starters", description: null, items: [item("a"), item("b"), item("c")] },
  { id: "empty", name: "Empty", description: null, items: [] },
  { id: "mains", name: "Mains", description: null, items: [item("d"), item("e"), item("f"), item("g"), item("h")] },
];

describe("paginate", () => {
  it("builds cover, contents, chapters with their dish pages, then the end", () => {
    const pages = paginate(categories, 2);
    assert.deepEqual(
      pages.map((p) => p.kind),
      ["cover", "contents", "chapter", "dishes", "dishes", "chapter", "dishes", "dishes", "dishes", "end"],
    );
  });

  it("splits a long category over several pages and keeps every dish once", () => {
    const pages = paginate(categories, 2);
    const mains = pages.filter((p) => p.kind === "dishes" && p.categoryId === "mains");
    assert.deepEqual(
      mains.map((p) => (p.kind === "dishes" ? p.items.map((i) => i.id) : [])),
      [["d", "e"], ["f", "g"], ["h"]],
    );
    assert.deepEqual(mains.map((p) => (p.kind === "dishes" ? `${p.part}/${p.parts}` : "")), ["1/3", "2/3", "3/3"]);
  });

  it("uses one dish per page when asked", () => {
    const pages = paginate(categories, 1);
    assert.equal(pages.filter((p) => p.kind === "dishes").length, 8);
  });

  it("skips empty categories and works with no category at all", () => {
    assert.equal(chapterIndex(paginate(categories, 2), "empty"), -1);
    assert.deepEqual(paginate([], 2).map((p) => p.kind), ["cover", "contents", "end"]);
  });

  it("ends with the order page when the book is used to order", () => {
    assert.equal(paginate(categories, 2, true).at(-1)?.kind, "order");
    assert.equal(paginate(categories, 2).at(-1)?.kind, "end");
    assert.equal(findAnchor(paginate(categories, 1, true), { kind: "order" }), paginate(categories, 1, true).length - 1);
  });

  it("clamps a nonsense page size to one dish", () => {
    assert.equal(paginate(categories, 0).filter((p) => p.kind === "dishes").length, 8);
  });
});

describe("anchors survive a layout change", () => {
  it("lands on the page holding the same dish after repagination", () => {
    const wide = paginate(categories, 2);
    const narrow = paginate(categories, 1);
    const anchor = anchorOf(wide[7]); // mains, dishes f and g
    assert.equal(anchor.itemId, "f");
    const index = findAnchor(narrow, anchor);
    const page = narrow[index];
    assert.ok(page.kind === "dishes" && page.items[0].id === "f");
    // And back: the page with "g" alone maps to the pair that holds it.
    const back = findAnchor(wide, anchorOf(narrow[index + 1]));
    const backPage = wide[back];
    assert.ok(backPage.kind === "dishes" && backPage.items.some((i) => i.id === "g"));
  });

  it("falls back to the chapter, then to the cover", () => {
    const pages = paginate(categories, 2);
    assert.equal(findAnchor(pages, { kind: "dishes", categoryId: "mains", itemId: "gone" }), chapterIndex(pages, "mains"));
    assert.equal(findAnchor(pages, { kind: "chapter", categoryId: "gone" }), 0);
  });
});

describe("spreads", () => {
  it("pairs pages after a lone cover in the two-page layout", () => {
    assert.equal(spreadCount(5, true), 3);
    assert.equal(spreadCount(4, true), 3);
    assert.deepEqual(spreadPages(0, 5, true), { left: null, right: 0 });
    assert.deepEqual(spreadPages(1, 5, true), { left: 1, right: 2 });
    assert.deepEqual(spreadPages(2, 5, true), { left: 3, right: 4 });
    assert.deepEqual(spreadPages(2, 4, true), { left: 3, right: null });
  });

  it("maps every page to the spread that shows it", () => {
    for (let page = 0; page < 9; page += 1) {
      const { left, right } = spreadPages(spreadOfPage(page, true), 9, true);
      assert.ok(left === page || right === page, `page ${page}`);
    }
  });

  it("shows one page at a time in the one-page layout", () => {
    assert.equal(spreadCount(5, false), 5);
    assert.deepEqual(spreadPages(3, 5, false), { left: null, right: 3 });
    assert.equal(firstPageOfSpread(2, 5, true), 3);
    assert.equal(firstPageOfSpread(0, 5, true), 0);
  });
});

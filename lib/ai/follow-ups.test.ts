import assert from "node:assert/strict";
import { test } from "node:test";
import { followUpText, suggestFollowUps } from "./follow-ups.ts";

const menu = {
  found: true,
  name: "Dinner",
  itemCount: 24,
  categories: [
    {
      name: "Mains",
      items: [
        { name: "Lamb", price: 42, available: true },
        { name: "Fish", price: 36, available: false },
      ],
    },
    { name: "Dessert", items: [{ name: "Cake", price: 14, available: true }] },
  ],
};

test("a menu lookup offers a question, a category choice, and a typed dish name", () => {
  const next = suggestFollowUps([{ tool: "get_menu", data: menu }]);

  assert.deepEqual(
    next.map((item) => item.kind),
    ["ask", "pick", "write"]
  );
  assert.equal(next[0]?.prompt, "Which items are the most expensive?");
  assert.deepEqual(next[1]?.options, ["Mains", "Dessert"]);
  assert.equal(followUpText(next[1]?.prompt ?? "", "Mains"), "Show me the items in Mains.");
  assert.equal(followUpText(next[2]?.prompt ?? "", "  Lamb  "), "Find menu items named Lamb.");
});

test("a missing price replaces the expensive-item question", () => {
  const next = suggestFollowUps([
    {
      tool: "get_menu",
      data: {
        found: true,
        categories: [{ name: "Mains", items: [{ name: "Bread", price: null, available: true }] }],
      },
    },
  ]);

  assert.equal(next[0]?.prompt, "Which menu items have no price?");
});

test("follow-ups stay inside the tools that ran", () => {
  const next = suggestFollowUps([
    { tool: "get_menu", data: menu },
    { tool: "get_sales", data: { bestSelling: ["Lamb"] } },
  ]);
  const text = JSON.stringify(next);

  assert.equal(next.length, 3);
  assert.equal(text.includes("best"), false);
  assert.equal(text.includes("reservation"), false);
  assert.equal(text.includes("order"), false);
});

test("an empty or missing lookup suggests nothing", () => {
  assert.deepEqual(suggestFollowUps([]), []);
  assert.deepEqual(suggestFollowUps([{ tool: "get_menu", data: { found: false } }]), []);
});

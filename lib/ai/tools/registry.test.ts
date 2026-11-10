import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createRegistry, type ToolAccess } from "./registry.ts";

const TOOL_NAMES = ["get_restaurant", "get_floors", "get_menu", "get_staff"] as const;

const ownerA: ToolAccess = { userId: "owner-a", restaurantId: "restaurant-a" };

function ownsA(userId: string, restaurantId: string) {
  return Promise.resolve(userId === ownerA.userId && restaurantId === ownerA.restaurantId);
}

function registryFor(calls: string[]) {
  return createRegistry(
    TOOL_NAMES.map((name) => ({
      name,
      description: name,
      parameters: { type: "object" as const, properties: {}, additionalProperties: false as const },
      schema: z.object({}).strict(),
      run: (restaurantId: string) => {
        calls.push(`${name}:${restaurantId}`);
        return Promise.resolve({ restaurantId });
      },
    })),
    ownsA
  );
}

test("an owner cannot read another restaurant through any tool", async () => {
  const calls: string[] = [];
  const registry = registryFor(calls);

  for (const name of TOOL_NAMES) {
    const result = (await registry.run(name, { userId: "owner-a", restaurantId: "restaurant-b" }, "{}")) as {
      error?: string;
    };
    assert.equal(typeof result.error, "string");
  }

  assert.deepEqual(calls, []);
});

test("a tool argument cannot switch the restaurant", async () => {
  const calls: string[] = [];
  const registry = registryFor(calls);

  for (const name of TOOL_NAMES) {
    const result = (await registry.run(
      name,
      ownerA,
      JSON.stringify({ restaurantId: "restaurant-b", limit: 100000 })
    )) as { error?: string };
    assert.equal(typeof result.error, "string");
  }

  assert.deepEqual(calls, []);
});

test("an allowed tool receives only the authorized restaurant", async () => {
  const calls: string[] = [];
  const registry = registryFor(calls);

  for (const name of TOOL_NAMES) {
    const result = (await registry.run(name, ownerA, "{}")) as {
      data?: { restaurantId?: string };
      source?: { tool?: string };
    };
    assert.equal(result.data?.restaurantId, "restaurant-a");
    assert.equal(result.source?.tool, name);
  }

  assert.deepEqual(
    calls,
    TOOL_NAMES.map((name) => `${name}:restaurant-a`)
  );
});

test("a menu source names the item count from the query", async () => {
  const registry = createRegistry(
    [
      {
        name: "get_menu",
        description: "menu",
        parameters: { type: "object" as const, properties: {}, additionalProperties: false as const },
        schema: z.object({}).strict(),
        run: () => Promise.resolve({ found: true, name: "Dinner", itemCount: 24 }),
      },
    ],
    async () => true
  );

  const result = (await registry.run("get_menu", ownerA, "{}")) as {
    source?: { metric?: string; records?: string[]; context?: string; tool?: string };
  };

  assert.equal(result.source?.tool, "get_menu");
  assert.equal(result.source?.metric, "24 active menu items");
  assert.deepEqual(result.source?.records, ["Dinner"]);
  assert.equal(result.source?.context, "Signed-in restaurant");
});

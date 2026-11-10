import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MIN_REFRESH_DELAY_MS,
  REFRESH_MARGIN_MS,
  needsRefresh,
  refreshDelay,
  tokenExpiresAt,
} from "./token-expiry.ts";

function jwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

test("the expiry is read from the exp claim, in milliseconds", () => {
  assert.equal(tokenExpiresAt(jwt({ sub: "u1", exp: 1_800_000_000 })), 1_800_000_000_000);
});

test("a token with no usable expiry returns null instead of throwing", () => {
  assert.equal(tokenExpiresAt("not-a-token"), null);
  assert.equal(tokenExpiresAt("a.%%%.c"), null);
  assert.equal(tokenExpiresAt(jwt({ sub: "u1" })), null);
  assert.equal(tokenExpiresAt(jwt({ exp: "soon" })), null);
});

test("the refresh is scheduled one margin before expiry", () => {
  const now = 1_000_000;
  const expiresAt = now + 15 * 60_000;
  assert.equal(refreshDelay(expiresAt, now), 15 * 60_000 - REFRESH_MARGIN_MS);
});

test("an already expired or nearly expired token never schedules a tight loop", () => {
  const now = 1_000_000;
  assert.equal(refreshDelay(now - 10_000, now), MIN_REFRESH_DELAY_MS);
  assert.equal(refreshDelay(now + 10_000, now), MIN_REFRESH_DELAY_MS);
});

test("a token needs a refresh once it is inside the margin", () => {
  const now = 1_000_000;
  assert.equal(needsRefresh(now + REFRESH_MARGIN_MS + 1, now), false);
  assert.equal(needsRefresh(now + REFRESH_MARGIN_MS, now), true);
  assert.equal(needsRefresh(now - 1, now), true);
});

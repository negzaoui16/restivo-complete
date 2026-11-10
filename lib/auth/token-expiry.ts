/**
 * Access-token expiry helpers, kept free of imports so node:test can run them.
 *
 * The client only reads the `exp` claim to decide when to refresh. It never
 * trusts the token: the server verifies the signature on every request.
 */

/** Refresh this long before the token actually expires. */
export const REFRESH_MARGIN_MS = 60_000;

/** Never schedule a refresh sooner than this, to avoid tight loops. */
export const MIN_REFRESH_DELAY_MS = 5_000;

/** Wait this long before retrying after a network or server failure. */
export const RETRY_DELAY_MS = 30_000;

/** Expiry of a JWT in epoch milliseconds, or `null` when it cannot be read. */
export function tokenExpiresAt(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) return null;

  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(globalThis.atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null;
  } catch {
    return null;
  }
}

/** How long to wait before refreshing a token that expires at `expiresAt`. */
export function refreshDelay(expiresAt: number, now: number): number {
  return Math.max(expiresAt - now - REFRESH_MARGIN_MS, MIN_REFRESH_DELAY_MS);
}

/** True when the token is expired or inside the refresh margin. */
export function needsRefresh(expiresAt: number, now: number): boolean {
  return expiresAt - now <= REFRESH_MARGIN_MS;
}

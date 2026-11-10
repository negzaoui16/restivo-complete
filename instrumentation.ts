/**
 * Next.js loads this file once when the Node.js server starts.
 * The Temporal polyfill must exist on `globalThis` before Prisma
 * decodes any timestamptz column.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("temporal-polyfill/full/global");
  }
}

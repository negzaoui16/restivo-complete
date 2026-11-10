/**
 * Transaction-scoped lock helper.
 * With MongoDB Atlas, concurrency is managed natively.
 */
import { db } from "@/lib/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function advisoryXactLock(_tx: Tx, _key: string): Promise<void> {
  // No-op for MongoDB Atlas
  return Promise.resolve();
}

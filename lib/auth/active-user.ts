/**
 * Resolves the signed-in user from the Bearer token and rejects accounts that
 * are suspended or deleted. Identity always comes from the JWT, never from the
 * request body.
 */
import { db } from "@/lib/db";
import { AuthError } from "./errors";
import { requireUserId } from "./session";

export async function requireActiveUser(request: Request) {
  const userId = await requireUserId(request);
  const user = await db.orm.public.User.where({ id: userId }).first();

  if (!user) throw new AuthError("INVALID_TOKEN");
  if (user.status === "SUSPENDED") throw new AuthError("USER_SUSPENDED");
  if (user.status === "DELETED") throw new AuthError("USER_DELETED");

  return user;
}

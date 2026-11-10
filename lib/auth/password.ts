/**
 * Password hashing using bcryptjs.
 *
 * `bcryptjs` is a pure-JS implementation – no native addons, works everywhere.
 *
 * SALT_ROUNDS = 12:
 *   - 10 rounds ≈ 100 ms (acceptable minimum)
 *   - 12 rounds ≈ 400 ms (good balance: brute-force resistant, UX acceptable)
 *   - 14+ rounds start to feel slow for interactive sign-in flows
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Returns the bcrypt hash of a plain-text password. */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * Compares a plain-text password against a stored bcrypt hash.
 *
 * Returns `true` when they match, `false` otherwise.
 * Never throws – callers are expected to throw `INVALID_CREDENTIALS` themselves.
 */
export async function verifyPassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

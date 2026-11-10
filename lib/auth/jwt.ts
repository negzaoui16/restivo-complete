/**
 * JWT utilities using the `jose` library (edge-compatible, no Node.js crypto).
 *
 * Two token types:
 *  - Access token  – short-lived (15 min), sent in Authorization header
 *  - Refresh token – long-lived (7 days), stored in an httpOnly cookie
 *
 * The `type` claim (`"access"` | `"refresh"`) is embedded in each JWT so
 * a refresh token can never be accepted as an access token and vice-versa.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import {
  ACCESS_TOKEN_TTL,
  JWT_ALGORITHM,
  REFRESH_TOKEN_TTL,
} from "./constants";
import { AuthError } from "./errors";

// ─── Secret ──────────────────────────────────────────────────────────────────

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is not set. " +
        "Add it to your .env file before starting the server."
    );
  }
  return new TextEncoder().encode(secret);
}

// ─── Payload Types ───────────────────────────────────────────────────────────

export interface AccessTokenPayload extends JWTPayload {
  type: "access";
  sub: string; // user id
  email: string;
}

export interface RefreshTokenPayload extends JWTPayload {
  type: "refresh";
  sub: string; // user id
}

// ─── Signing ─────────────────────────────────────────────────────────────────

export async function signAccessToken(userId: string, email: string): Promise<string> {
  const payload: Omit<AccessTokenPayload, keyof JWTPayload> = {
    type: "access",
    email,
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecret());
}

export async function signRefreshToken(userId: string): Promise<string> {
  const payload: Omit<RefreshTokenPayload, keyof JWTPayload> = {
    type: "refresh",
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getSecret());
}

// ─── Verification ────────────────────────────────────────────────────────────

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  return verifyToken<AccessTokenPayload>(token, "access");
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  return verifyToken<RefreshTokenPayload>(token, "refresh");
}

async function verifyToken<T extends JWTPayload & { type: string }>(
  token: string,
  expectedType: T["type"]
): Promise<T> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [JWT_ALGORITHM],
    });

    const typedPayload = payload as T;

    if (typedPayload.type !== expectedType) {
      throw new AuthError("INVALID_TOKEN");
    }

    return typedPayload;
  } catch (err) {
    if (err instanceof AuthError) throw err;

    // jose throws JWTExpired, JWTInvalid, etc. – map to AuthError
    const name = (err as { code?: string; name?: string })?.name ?? "";
    const code = (err as { code?: string })?.code ?? "";

    if (name === "JWTExpired" || code === "ERR_JWT_EXPIRED") {
      throw new AuthError("EXPIRED_TOKEN");
    }

    throw new AuthError("INVALID_TOKEN");
  }
}

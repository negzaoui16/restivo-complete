/**
 * Auth API client.
 *
 * All communication between the client and the auth route handlers lives here.
 * Functions throw `ApiError` on non-ok responses so callers can pattern-match
 * on the typed `code` field instead of parsing raw HTTP errors.
 *
 * The refresh token travels exclusively in an httpOnly cookie managed by the
 * server.  These functions never touch it directly.
 */
import { SESSION_HINT_COOKIE_NAME } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  canManageRestaurants: boolean;
  managementRole: "OWNER" | "MANAGER" | null;
  isStaff: boolean;
}

export interface AuthUserFull extends AuthUser {
  status: string;
  emailVerifiedAt: string | null;
  phone: string | null;
  bio: string | null;
  createdAt: unknown;
}

export type SignUpRole = "owner" | "staff" | "customer";

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: SignUpRole;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
  /** Only present on sign-up – use for post-registration routing. */
  role?: SignUpRole;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  /** Request field the server blames, when it names one. */
  readonly field?: string;

  constructor(code: string, message: string, status: number, field?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (json as { code?: string }).code ?? "UNKNOWN_ERROR",
      (json as { message?: string }).message ?? "An unexpected error occurred.",
      res.status
    );
  }
  return json as T;
}

// ─── Auth calls ───────────────────────────────────────────────────────────────

/** Create a new account (3-step sign-up wizard final step). */
export async function apiSignUp(input: SignUpInput): Promise<AuthResult> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include", // receive the httpOnly refresh cookie
  });
  return handleResponse<AuthResult>(res);
}

/** Sign in with email + password. */
export async function apiSignIn(input: SignInInput): Promise<AuthResult> {
  const res = await fetch("/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });
  return handleResponse<AuthResult>(res);
}

/** Sign out – clears the httpOnly refresh cookie on the server. */
export async function apiSignOut(): Promise<void> {
  await fetch("/api/auth/signout", {
    method: "POST",
    credentials: "include",
  });
}

/** True when the JS-readable session hint cookie is present. */
export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((part) => part.startsWith(`${SESSION_HINT_COOKIE_NAME}=`));
}

/**
 * Exchange the httpOnly refresh cookie for a new access token.
 * Returns `null` if no valid session exists (e.g. first visit, expired).
 * Callers should check `hasSessionHint()` first to avoid a 401 in DevTools.
 */
export async function apiRefresh(): Promise<{ accessToken: string } | null> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  if (res.status === 401 || res.status === 403) return null;
  return handleResponse<{ accessToken: string }>(res);
}

/** Fetch the current user's profile using an access token. */
export async function apiMe(accessToken: string): Promise<AuthUserFull> {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  const json = await handleResponse<{ user: AuthUserFull }>(res);
  return json.user;
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  displayName?: string;
  phone?: string;
  bio?: string;
}

/** Persist profile fields (names, phone, dining note). */
export async function apiUpdateProfile(
  accessToken: string,
  input: UpdateProfileInput
): Promise<AuthUserFull> {
  const res = await fetch("/api/auth/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const json = await handleResponse<{ user: AuthUserFull }>(res);
  return json.user;
}

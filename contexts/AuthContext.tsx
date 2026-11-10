"use client";

/**
 * Auth context.
 *
 * Stores the access token in memory (React state) so it's never written to
 * localStorage or any other persistent browser storage.  The refresh token
 * lives exclusively in an httpOnly cookie managed by the server.
 *
 * On mount the provider silently attempts a token refresh so the user stays
 * logged in across page reloads without ever seeing a flash of "logged out".
 *
 * Usage
 * -----
 *   const { user, signIn, signUp, signOut, isLoading } = useAuth();
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ApiError,
  apiMe,
  apiRefresh,
  apiSignIn,
  apiSignOut,
  apiSignUp,
  apiUpdateProfile,
  hasSessionHint,
  type AuthUser,
  type AuthUserFull,
  type SignInInput,
  type SignUpInput,
  type SignUpRole,
  type UpdateProfileInput,
} from "@/lib/auth/client";
import {
  RETRY_DELAY_MS,
  needsRefresh,
  refreshDelay,
  tokenExpiresAt,
} from "@/lib/auth/token-expiry";

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Null when not authenticated or while the initial refresh is in-flight. */
  user: AuthUser | null;
  /** True during the initial session restore (refresh on mount). */
  isLoading: boolean;
  /** True after the initial restore has completed (either way). */
  isReady: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ role: SignUpRole }>;
  signOut: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<AuthUserFull>;
  /** Returns the current in-memory access token (may be null). */
  getAccessToken: () => string | null;
  /**
   * Like `getAccessToken`, but refreshes first when the token is expired or
   * about to expire. Prefer this right before a request in long-lived pages.
   */
  getFreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Store the access token in a ref so we can read it outside of renders
  // (e.g. from fetch interceptors) without triggering re-renders on every
  // rotation.  Components that need a reactive value should read from `user`.
  const tokenRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Promise<string | null> | null>(null);
  const refreshRef = useRef<() => Promise<string | null>>(async () => null);

  // Single place that stores the token. It also schedules a silent refresh a
  // minute before expiry, so `getAccessToken()` keeps returning a valid token
  // for every existing caller without any change on their side.
  const applyToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const expiresAt = token ? tokenExpiresAt(token) : null;
    if (expiresAt !== null) {
      timerRef.current = setTimeout(() => {
        void refreshRef.current();
      }, refreshDelay(expiresAt, Date.now()));
    }
  }, []);

  // Concurrent callers share one in-flight refresh.
  const refreshNow = useCallback((): Promise<string | null> => {
    if (inflightRef.current) return inflightRef.current;

    const run = (async () => {
      try {
        const next = await apiRefresh();
        if (!next) {
          // The refresh cookie is gone, expired, or the account was disabled.
          applyToken(null);
          setUser(null);
          return null;
        }
        applyToken(next.accessToken);
        return next.accessToken;
      } catch {
        // Network or server hiccup: keep the session and try again shortly.
        timerRef.current = setTimeout(() => {
          void refreshRef.current();
        }, RETRY_DELAY_MS);
        return tokenRef.current;
      }
    })().finally(() => {
      inflightRef.current = null;
    });

    inflightRef.current = run;
    return run;
  }, [applyToken]);

  useEffect(() => {
    refreshRef.current = refreshNow;
  }, [refreshNow]);

  // Timers are throttled in background tabs, so check again on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const token = tokenRef.current;
      if (!token) return;
      const expiresAt = tokenExpiresAt(token);
      if (expiresAt !== null && needsRefresh(expiresAt, Date.now())) void refreshNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [refreshNow]);

  // ── Restore session on mount ──────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      // No session hint → nobody is logged in. Skip the network call so
      // the browser console does not show a 401 on every anonymous visit.
      if (!hasSessionHint()) {
        if (!cancelled) {
          setIsLoading(false);
          setIsReady(true);
        }
        return;
      }

      try {
        const refreshed = await apiRefresh();
        if (cancelled || !refreshed) return;

        applyToken(refreshed.accessToken);

        const me = await apiMe(refreshed.accessToken);
        if (cancelled) return;

        setUser({
          id: me.id,
          email: me.email,
          firstName: me.firstName,
          lastName: me.lastName,
          displayName: me.displayName,
          avatarUrl: me.avatarUrl,
          canManageRestaurants: me.canManageRestaurants,
          managementRole: me.managementRole,
          isStaff: me.isStaff,
        });
      } catch {
        // No valid session – leave user as null, silently.
        applyToken(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsReady(true);
        }
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, [applyToken]);

  // ── Sign in ───────────────────────────────────────────────────────────────

  const signIn = useCallback(async (input: SignInInput): Promise<void> => {
    const result = await apiSignIn(input); // throws ApiError on failure
    applyToken(result.accessToken);
    setUser(result.user);
  }, [applyToken]);

  // ── Sign up ───────────────────────────────────────────────────────────────

  const signUp = useCallback(
    async (input: SignUpInput): Promise<{ role: SignUpRole }> => {
      const result = await apiSignUp(input); // throws ApiError on failure
      applyToken(result.accessToken);
      setUser(result.user);
      return { role: result.role ?? "customer" };
    },
    [applyToken]
  );

  // ── Sign out ──────────────────────────────────────────────────────────────

  const signOut = useCallback(async (): Promise<void> => {
    applyToken(null);
    setUser(null);
    await apiSignOut().catch(() => {}); // best-effort – clear cookie server-side
  }, [applyToken]);

  const getFreshAccessToken = useCallback(async (): Promise<string | null> => {
    const token = tokenRef.current;
    if (!token) return null;
    const expiresAt = tokenExpiresAt(token);
    if (expiresAt === null || !needsRefresh(expiresAt, Date.now())) return token;
    return refreshNow();
  }, [refreshNow]);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<AuthUserFull> => {
      const token = await getFreshAccessToken();
      if (!token) {
        throw new ApiError("MISSING_TOKEN", "Please sign in again.", 401);
      }
      const me = await apiUpdateProfile(token, input);
      setUser({
        id: me.id,
        email: me.email,
        firstName: me.firstName,
        lastName: me.lastName,
        displayName: me.displayName,
        avatarUrl: me.avatarUrl,
        canManageRestaurants: me.canManageRestaurants,
        managementRole: me.managementRole,
        isStaff: me.isStaff,
      });
      return me;
    },
    [getFreshAccessToken]
  );

  // ── Accessor for the raw token ────────────────────────────────────────────

  const getAccessToken = useCallback((): string | null => tokenRef.current, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isReady,
        signIn,
        signUp,
        signOut,
        updateProfile,
        getAccessToken,
        getFreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return ctx;
}

// Re-export ApiError so pages can import everything from one place
export { ApiError };

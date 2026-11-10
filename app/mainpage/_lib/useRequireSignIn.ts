"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Customer pages need a session. Once the initial session restore has finished,
 * anonymous visitors are sent to the sign-in page.
 */
export function useRequireSignIn() {
  const router = useRouter();
  const { user, isReady, getFreshAccessToken } = useAuth();

  useEffect(() => {
    if (isReady && !user) router.replace("/auth/signin");
  }, [isReady, user, router]);

  return { signedIn: Boolean(user), checking: !isReady || !user, getFreshAccessToken };
}

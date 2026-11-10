"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Homepage from "./homepage/page";

export default function RootPage() {
  const { user, isLoading, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone && isReady && !isLoading) {
      if (user) {
        router.replace("/mainpage");
      } else {
        router.replace("/auth/signin");
      }
    }
  }, [user, isLoading, isReady, router]);

  return <Homepage />;
}

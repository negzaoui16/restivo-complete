"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function StartPage() {
  const { user, isLoading, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !isReady) return;

    if (user) {
      router.replace("/mainpage");
    } else {
      router.replace("/auth/signin");
    }
  }, [user, isLoading, isReady, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F2] text-[#1A1A1A]">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
        <img
          src="/VisualIdentity/AppIcon.png"
          alt="Restivo"
          className="w-20 h-20 rounded-3xl shadow-lg border border-[#E8E2D7] object-cover"
        />
        <div className="flex items-center gap-2 text-sm font-semibold text-[#736D65]">
          <Loader2 className="w-4 h-4 animate-spin text-[#B55234]" />
          <span>Chargement de Restivo…</span>
        </div>
      </div>
    </div>
  );
}
